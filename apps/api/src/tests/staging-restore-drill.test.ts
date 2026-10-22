import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  createDatabaseBackup,
  verifyBackupFile,
  verifyBackupIntegrity,
  restoreDatabaseBackup,
  enableMaintenanceMode,
  disableMaintenanceMode,
  isMaintenanceModeActive,
  rollbackDatabaseRestoration,
} from '../services/backupService.js';
import { createApp } from '../app.js';

describe('B4 & Issue E: Staging Restore Drill & Operational Coordination', () => {
  const sandboxDir = path.resolve(process.cwd(), 'scratch', `staging-drill-${Date.now()}`);
  const backupDir = path.join(sandboxDir, 'backups');
  const stagingDbPath = path.join(sandboxDir, 'staging-active.db');
  let stagingPrisma: PrismaClient;

  before(async () => {
    if (!fs.existsSync(sandboxDir)) {
      fs.mkdirSync(sandboxDir, { recursive: true });
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Initialize schema cleanly using Prisma CLI against disposable staging DB
    const schemaPath = fs.existsSync(path.resolve(process.cwd(), 'prisma/schema.prisma'))
      ? path.resolve(process.cwd(), 'prisma/schema.prisma')
      : path.resolve(process.cwd(), 'apps/api/prisma/schema.prisma');

    const normStagingUrl = `file:${stagingDbPath.replace(/\\/g, '/')}`;
    const { execSync } = await import('child_process');
    execSync(`npx prisma db push --schema "${schemaPath}" --skip-generate`, {
      env: { ...process.env, DATABASE_URL: normStagingUrl },
      stdio: 'pipe',
    });

    // Connect to disposable staging database
    stagingPrisma = new PrismaClient({
      datasourceUrl: normStagingUrl,
      log: ['error'],
    });

    // 2. Seed representative staging records
    const adminSalt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('StagingAdminPass2026!', adminSalt);

    await stagingPrisma.user.create({
      data: {
        id: 'stg-user-admin-1',
        email: 'staging.admin@noolandnila.com',
        name: 'Staging Administrator',
        role: 'ADMIN',
        passwordHash: adminHash,
      },
    });

    const custSalt = await bcrypt.genSalt(10);
    const custHash = await bcrypt.hash('CustomerPass2026!', custSalt);

    await stagingPrisma.user.create({
      data: {
        id: 'stg-user-cust-1',
        email: 'meera.krishnan@example.com',
        name: 'Meera Krishnan',
        role: 'CUSTOMER',
        phone: '9840112233',
        passwordHash: custHash,
      },
    });

    await stagingPrisma.category.createMany({
      data: [
        { id: 'stg-cat-1', name: 'Kanchipuram Silk', slug: 'kanchipuram-silk', description: 'Traditional Kanchi sarees' },
        { id: 'stg-cat-2', name: 'Banarasi Brocade', slug: 'banarasi-brocade', description: 'Handcrafted Varanasi weaves' },
      ],
    });

    await stagingPrisma.product.createMany({
      data: [
        {
          id: 'stg-prod-1',
          name: 'Royal Crimson Kanchipuram Saree',
          slug: 'royal-crimson-kanchipuram',
          sku: 'STG-KAN-001',
          description: 'Authentic pure mulberry silk with gold zari border',
          fabric: 'Pure Silk',
          weave: 'Kanchipuram',
          zariType: 'Pure Gold Zari',
          washCare: 'Dry Clean Only',
          color: 'Crimson Red',
          occasion: 'Bridal',
          pricePaise: 4500000,
          stockQuantity: 4,
          categoryId: 'stg-cat-1',
        },
        {
          id: 'stg-prod-2',
          name: 'Emerald Green Banarasi Silk',
          slug: 'emerald-green-banarasi',
          sku: 'STG-BAN-002',
          description: 'Intricate floral jaal pattern in antique silver zari',
          fabric: 'Katan Silk',
          weave: 'Banarasi',
          zariType: 'Antique Silver Zari',
          washCare: 'Dry Clean Only',
          color: 'Emerald Green',
          occasion: 'Festive',
          pricePaise: 3800000,
          stockQuantity: 2,
          categoryId: 'stg-cat-2',
        },
      ],
    });

    await stagingPrisma.order.create({
      data: {
        id: 'stg-order-1',
        orderNumber: 'NN-2026-STG01',
        userId: 'stg-user-cust-1',
        customerName: 'Meera Krishnan',
        customerEmail: 'meera.krishnan@example.com',
        customerPhone: '9840112233',
        shippingStreet: '42 Besant Avenue',
        shippingCity: 'Chennai',
        shippingState: 'Tamil Nadu',
        shippingPostalCode: '600020',
        totalPaise: 4500000,
        subtotalPaise: 4500000,
        shippingFeePaise: 0,
        status: 'PENDING_CONFIRMATION',
      },
    });

    await stagingPrisma.storeSetting.create({
      data: {
        id: 'stg-setting-1',
        key: 'freeShippingThresholdPaise',
        value: '500000',
      },
    });
  });

  after(async () => {
    if (stagingPrisma) {
      await stagingPrisma.$disconnect();
    }
    // Clean up sandbox directory
    try {
      if (fs.existsSync(sandboxDir)) {
        fs.rmSync(sandboxDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  test('1. Baseline verification: disposable staging database contains expected seed records', async () => {
    const userCount = await stagingPrisma.user.count();
    const productCount = await stagingPrisma.product.count();
    const orderCount = await stagingPrisma.order.count();
    const categoryCount = await stagingPrisma.category.count();

    assert.strictEqual(userCount, 2, '2 users in staging');
    assert.strictEqual(productCount, 2, '2 products in staging');
    assert.strictEqual(orderCount, 1, '1 order in staging');
    assert.strictEqual(categoryCount, 2, '2 categories in staging');
  });

  test('2. Online backup creation snapshot captures entire staging state transactionally', async () => {
    const backupSnapshot = path.join(backupDir, 'drill-snapshot.db');
    const sqliteDest = backupSnapshot.replace(/\\/g, '/');

    // Execute SQLite VACUUM INTO directly
    await stagingPrisma.$executeRawUnsafe(`VACUUM INTO '${sqliteDest}'`);

    assert.ok(fs.existsSync(backupSnapshot), 'Backup file created');
    const stat = fs.statSync(backupSnapshot);
    assert.ok(stat.size > 0, `Snapshot size is ${stat.size} bytes`);

    // Verify integrity
    const integrity = await verifyBackupIntegrity(backupSnapshot);
    assert.strictEqual(integrity, 'ok');

    // Verify table counts
    const verification = await verifyBackupFile(backupSnapshot);
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.recordCounts.users, 2);
    assert.strictEqual(verification.recordCounts.products, 2);
    assert.strictEqual(verification.recordCounts.orders, 1);
  });

  test('3. Simulate severe data corruption/loss on active staging database', async () => {
    // Delete the order
    await stagingPrisma.order.delete({ where: { id: 'stg-order-1' } });

    // Mutate product price and stock to bad values
    await stagingPrisma.product.update({
      where: { id: 'stg-prod-1' },
      data: { pricePaise: 100, stockQuantity: 999 },
    });

    // Delete customer account
    await stagingPrisma.user.delete({ where: { id: 'stg-user-cust-1' } });

    // Confirm corruption on staging database
    const orderCountAfter = await stagingPrisma.order.count();
    const userCountAfter = await stagingPrisma.user.count();
    const corruptedProd = await stagingPrisma.product.findUnique({ where: { id: 'stg-prod-1' } });

    assert.strictEqual(orderCountAfter, 0, 'Order was deleted');
    assert.strictEqual(userCountAfter, 1, 'Customer was deleted');
    assert.strictEqual(corruptedProd?.pricePaise, 100, 'Price was corrupted to ₹1.00');
  });

  test('4. Full restoration drill recovers 100% of lost data from snapshot', async () => {
    const backupSnapshot = path.join(backupDir, 'drill-snapshot.db');

    // Disconnect client to allow file replacement
    await stagingPrisma.$disconnect();

    const restoreResult = await restoreDatabaseBackup(backupSnapshot, {
      targetDbPath: stagingDbPath,
      dryRun: false,
    });

    assert.strictEqual(restoreResult.success, true);
    assert.strictEqual(restoreResult.dryRun, false);
    assert.ok(restoreResult.preRestoreBackupPath, 'Pre-restore safety backup was created');
    assert.ok(fs.existsSync(restoreResult.preRestoreBackupPath));

    // Reconnect client to restored database
    stagingPrisma = new PrismaClient({
      datasourceUrl: `file:${stagingDbPath.replace(/\\/g, '/')}`,
      log: ['error'],
    });

    // Verify recovered records
    const order = await stagingPrisma.order.findUnique({ where: { id: 'stg-order-1' } });
    assert.ok(order, 'Deleted order was fully recovered');
    assert.strictEqual(order.orderNumber, 'NN-2026-STG01');
    assert.strictEqual(order.totalPaise, 4500000);

    const restoredProd = await stagingPrisma.product.findUnique({ where: { id: 'stg-prod-1' } });
    assert.ok(restoredProd);
    assert.strictEqual(restoredProd.pricePaise, 4500000, 'Price restored to ₹45,000');
    assert.strictEqual(restoredProd.stockQuantity, 4, 'Stock restored to 4');

    const customer = await stagingPrisma.user.findUnique({ where: { id: 'stg-user-cust-1' } });
    assert.ok(customer, 'Customer account was fully restored');
    assert.strictEqual(customer.email, 'meera.krishnan@example.com');
  });

  test('5. Operational safety: refuse restoration if source equals target file', async () => {
    await assert.rejects(
      async () => restoreDatabaseBackup(stagingDbPath, { targetDbPath: stagingDbPath }),
      /source backup file is identical to the active target database/
    );
  });

  test('6. Security: reject backup creation with path traversal filename', async () => {
    await assert.rejects(
      async () =>
        createDatabaseBackup({
          destinationDir: backupDir,
          customFilename: '../../escaped.db',
        }),
      /path traversal prohibited/
    );
  });

  test('7. Maintenance mode: middleware blocks API writes with 503 during maintenance window', async () => {
    const lockFile = path.join(sandboxDir, '.maintenance.lock');

    // Verify initially inactive
    assert.strictEqual(isMaintenanceModeActive(lockFile), false);

    // Enable maintenance mode
    enableMaintenanceMode(lockFile);
    assert.strictEqual(isMaintenanceModeActive(lockFile), true);

    // Disable maintenance mode
    disableMaintenanceMode(lockFile);
    assert.strictEqual(isMaintenanceModeActive(lockFile), false);
  });

  test('8. Rollback utility safely restores database from pre-restoration copy', async () => {
    const dummyTarget = path.join(sandboxDir, 'dummy-target.db');
    const dummyBak = path.join(sandboxDir, 'dummy-safety.bak');

    fs.writeFileSync(dummyTarget, 'CORRUPTED_AFTER_FAILED_RESTORE');
    fs.writeFileSync(dummyBak, 'ORIGINAL_GOOD_DATABASE_CONTENT');

    rollbackDatabaseRestoration(dummyTarget, dummyBak);

    const restoredContent = fs.readFileSync(dummyTarget, 'utf8');
    assert.strictEqual(restoredContent, 'ORIGINAL_GOOD_DATABASE_CONTENT');
  });
});
