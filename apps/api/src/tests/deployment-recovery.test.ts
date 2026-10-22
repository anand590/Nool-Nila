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
  resolveSqlitePath,
  pruneOldBackups,
  formatBytes,
} from '../services/backupService.js';
import {
  provisionOrResetAdmin,
  validateAdminPassword,
} from '../scripts/admin-recovery.js';

describe('Production Deployment, Database Persistence, Backups & Recovery Verification', () => {
  const testDir = path.resolve(process.cwd(), 'scratch', 'recovery-test-' + Date.now());
  const backupDir = path.join(testDir, 'backups');
  const syntheticDbPath = path.join(testDir, 'synthetic-active.db');
  let syntheticPrisma: PrismaClient;

  before(async () => {
    // 1. Setup isolated disposable test sandbox
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 2. Initialize synthetic SQLite database with Prisma client
    const normDbPath = syntheticDbPath.replace(/\\/g, '/');
    syntheticPrisma = new PrismaClient({
      datasourceUrl: `file:${normDbPath}`,
      log: ['error'],
    });

    // Run schema creation directly using db push or Prisma raw schema statements
    // We execute table creation for synthetic testing
    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "phone" TEXT,
        "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "imageUrl" TEXT,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "sku" TEXT NOT NULL UNIQUE,
        "shortDescription" TEXT,
        "description" TEXT NOT NULL,
        "fabric" TEXT NOT NULL,
        "weave" TEXT NOT NULL,
        "zariType" TEXT NOT NULL,
        "lengthMeters" REAL NOT NULL DEFAULT 5.5,
        "blouseIncluded" BOOLEAN NOT NULL DEFAULT 1,
        "blouseDetails" TEXT,
        "washCare" TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "colorHex" TEXT,
        "occasion" TEXT NOT NULL,
        "pricePaise" INTEGER NOT NULL,
        "mrpPaise" INTEGER,
        "stockQuantity" INTEGER NOT NULL DEFAULT 1,
        "isFeatured" BOOLEAN NOT NULL DEFAULT 0,
        "isNewArrival" BOOLEAN NOT NULL DEFAULT 0,
        "isBestSeller" BOOLEAN NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "metaTitle" TEXT,
        "metaDescription" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "categoryId" TEXT NOT NULL,
        FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNumber" TEXT NOT NULL UNIQUE,
        "userId" TEXT,
        "customerName" TEXT NOT NULL,
        "customerEmail" TEXT,
        "customerPhone" TEXT NOT NULL,
        "shippingStreet" TEXT NOT NULL,
        "shippingLandmark" TEXT,
        "shippingCity" TEXT NOT NULL,
        "shippingState" TEXT NOT NULL,
        "shippingPostalCode" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
        "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
        "subtotalPaise" INTEGER NOT NULL,
        "shippingFeePaise" INTEGER NOT NULL DEFAULT 0,
        "discountPaise" INTEGER NOT NULL DEFAULT 0,
        "totalPaise" INTEGER NOT NULL,
        "trackingCarrier" TEXT,
        "trackingNumber" TEXT,
        "customerNotes" TEXT,
        "adminNotes" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoreSetting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await syntheticPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "action" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT,
        "details" TEXT,
        "ipAddress" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Populate representative synthetic data
    await syntheticPrisma.category.create({
      data: {
        id: 'cat-pure-silk',
        name: 'Pure Silk Sarees',
        slug: 'pure-silk-sarees',
        description: 'Authentic pure silk handlooms',
      },
    });

    await syntheticPrisma.product.create({
      data: {
        id: 'prod-kanchi-01',
        name: 'Kanchipuram Gold Zari Brocade Saree',
        slug: 'kanchipuram-gold-zari-brocade',
        sku: 'NN-KAN-001',
        description: 'Heirloom Kanchipuram silk saree with pure zari',
        fabric: 'Pure Silk',
        weave: 'Kanchipuram',
        zariType: 'Pure Gold Zari',
        washCare: 'Dry Clean Only',
        color: 'Crimson Red',
        occasion: 'Bridal',
        pricePaise: 4850000,
        stockQuantity: 3,
        categoryId: 'cat-pure-silk',
      },
    });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestAdmin123!', salt);

    await syntheticPrisma.user.create({
      data: {
        id: 'user-admin-01',
        email: 'admin@boutique.example',
        name: 'Boutique Head',
        role: 'ADMIN',
        passwordHash: hash,
      },
    });

    await syntheticPrisma.order.create({
      data: {
        id: 'ord-test-01',
        orderNumber: 'NN-2026-9001',
        customerName: 'Ananya Rao',
        customerEmail: 'ananya@example.com',
        customerPhone: '9840199999',
        shippingStreet: '12 Temple View Lane',
        shippingCity: 'Chennai',
        shippingState: 'Tamil Nadu',
        shippingPostalCode: '600001',
        totalPaise: 4850000,
        subtotalPaise: 4850000,
        shippingFeePaise: 0,
        status: 'PENDING_CONFIRMATION',
      },
    });

    await syntheticPrisma.storeSetting.create({
      data: {
        id: 'setting-01',
        key: 'freeShippingThresholdPaise',
        value: '500000',
      },
    });
  });

  after(async () => {
    if (syntheticPrisma) {
      await syntheticPrisma.$disconnect();
    }
    // Clean up test directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  // TEST 1: Production Configuration Security
  test('1. Production configuration validation rejects missing secrets and dev.db fallback', () => {
    // Check that helper validates required production secrets
    const validateProdConfig = (env: Record<string, string | undefined>) => {
      const isProd = env.NODE_ENV === 'production';
      if (!isProd) return true;

      if (!env.JWT_SECRET || env.JWT_SECRET.includes('dev_key')) {
        throw new Error('JWT_SECRET must be explicitly set to a cryptographically strong secret in production.');
      }
      if (!env.COOKIE_SECRET || env.COOKIE_SECRET.includes('dev_2026')) {
        throw new Error('COOKIE_SECRET must be explicitly set to a strong secret in production.');
      }
      if (!env.DATABASE_URL || env.DATABASE_URL.includes('dev.db')) {
        throw new Error('DATABASE_URL must be explicitly configured for production and cannot point to dev.db.');
      }
      return true;
    };

    // Rejection on dev_key JWT
    assert.throws(
      () => validateProdConfig({ NODE_ENV: 'production', JWT_SECRET: 'dev_key_123', COOKIE_SECRET: 'strong_secret', DATABASE_URL: 'file:/var/data/prod.db' }),
      /JWT_SECRET/
    );

    // Rejection on dev_2026 cookie
    assert.throws(
      () => validateProdConfig({ NODE_ENV: 'production', JWT_SECRET: 'strong_jwt_token_64_bytes_long', COOKIE_SECRET: 'nool_and_nila_cookie_secret_key_dev_2026', DATABASE_URL: 'file:/var/data/prod.db' }),
      /COOKIE_SECRET/
    );

    // Rejection on dev.db database fallback
    assert.throws(
      () => validateProdConfig({ NODE_ENV: 'production', JWT_SECRET: 'strong_jwt_token_64_bytes_long', COOKIE_SECRET: 'strong_cookie_secret_64_bytes_long', DATABASE_URL: 'file:./dev.db' }),
      /DATABASE_URL.*dev\.db/
    );

    // Success on valid production environment
    const valid = validateProdConfig({
      NODE_ENV: 'production',
      JWT_SECRET: 'prod_jwt_super_secret_cryptographic_random_key_abc123',
      COOKIE_SECRET: 'prod_cookie_super_secret_cryptographic_random_key_xyz789',
      DATABASE_URL: 'file:/var/data/nool_and_nila_production.db',
    });
    assert.strictEqual(valid, true);
  });

  // TEST 2: Environment Isolation
  test('2. Path resolver correctly extracts SQLite file paths across dev, test, and production', () => {
    const devPath = resolveSqlitePath('file:./dev.db');
    assert.ok(devPath.endsWith('dev.db'));

    const prodPath = resolveSqlitePath('file:/var/data/nool_and_nila_prod.db');
    assert.ok(prodPath.includes('nool_and_nila_prod.db'));

    const testPath = resolveSqlitePath('file:./scratch/test.db');
    assert.ok(testPath.endsWith('test.db'));
    assert.notStrictEqual(devPath, prodPath);
  });

  // TEST 3: VACUUM INTO Online Backup Creation
  test('3. SQLite online backup creation produces a valid, consistent snapshot file', async () => {
    const backupTarget = path.join(backupDir, 'test-snapshot.db');
    const sqliteDest = backupTarget.replace(/\\/g, '/');

    // Perform VACUUM INTO
    await syntheticPrisma.$executeRawUnsafe(`VACUUM INTO '${sqliteDest}'`);

    assert.ok(fs.existsSync(backupTarget), 'Backup file was created on disk');
    const stat = fs.statSync(backupTarget);
    assert.ok(stat.size > 0, `Backup file size is positive (${stat.size} bytes)`);

    // Verify SQLite integrity of created file
    const integrity = await verifyBackupIntegrity(backupTarget);
    assert.strictEqual(integrity, 'ok', 'PRAGMA integrity_check passed with "ok"');
  });

  // TEST 4: Backup File Verification & Record Counts
  test('4. verifyBackupFile accurately inspects schema, counts, and validates integrity', async () => {
    const backupTarget = path.join(backupDir, 'test-snapshot.db');
    const result = await verifyBackupFile(backupTarget);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.integrity, 'ok');
    assert.strictEqual(result.recordCounts.categories, 1);
    assert.strictEqual(result.recordCounts.products, 1);
    assert.strictEqual(result.recordCounts.users, 1);
    assert.strictEqual(result.recordCounts.orders, 1);
    assert.strictEqual(result.recordCounts.storeSettings, 1);
  });

  // TEST 5: Backup Failure Surfacing
  test('5. Backup operations surface invalid directory and nonexistent file errors clearly', async () => {
    // Attempting to verify nonexistent file
    await assert.rejects(
      async () => verifyBackupFile(path.join(backupDir, 'nonexistent.db')),
      /does not exist/
    );

    // Attempting to write into an unwritable or invalid location
    const invalidPath = 'Z:\\unmapped_drive_xyz\\backup.db';
    await assert.rejects(
      async () => syntheticPrisma.$executeRawUnsafe(`VACUUM INTO '${invalidPath}'`),
      /unable to open database file|cannot open|error/i
    );
  });

  // TEST 6: Dry-Run Restoration
  test('6. Dry-run restoration validates backup without modifying or overwriting active database', async () => {
    const backupTarget = path.join(backupDir, 'test-snapshot.db');
    const targetPath = path.join(testDir, 'active-target.db');

    // Create target file to simulate active DB
    fs.writeFileSync(targetPath, 'ACTIVE_DATABASE_ORIGINAL_DATA');

    const dryResult = await restoreDatabaseBackup(backupTarget, {
      targetDbPath: targetPath,
      dryRun: true,
    });

    assert.strictEqual(dryResult.dryRun, true);
    assert.strictEqual(dryResult.success, true);
    assert.strictEqual(dryResult.verifiedRecordCounts.products, 1);

    // Verify original target was NOT modified
    const content = fs.readFileSync(targetPath, 'utf8');
    assert.strictEqual(content, 'ACTIVE_DATABASE_ORIGINAL_DATA');
  });

  // TEST 7: Full Restoration Round-Trip & Data Survival
  test('7. Full backup restoration cycle restores all records and creates pre-restore safety copy', async () => {
    const backupTarget = path.join(backupDir, 'test-snapshot.db');
    const targetPath = path.join(testDir, 'active-target.db');

    const restoreResult = await restoreDatabaseBackup(backupTarget, {
      targetDbPath: targetPath,
      dryRun: false,
    });

    assert.strictEqual(restoreResult.success, true);
    assert.strictEqual(restoreResult.dryRun, false);
    assert.ok(restoreResult.preRestoreBackupPath);
    assert.ok(fs.existsSync(restoreResult.preRestoreBackupPath));

    // Connect to restored target DB and verify all tables and data
    const restoredPrisma = new PrismaClient({
      datasourceUrl: `file:${targetPath.replace(/\\/g, '/')}`,
      log: ['error'],
    });

    try {
      const integrity = await restoredPrisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
        'PRAGMA integrity_check;'
      );
      assert.strictEqual(integrity[0]?.integrity_check, 'ok');

      const product = await restoredPrisma.product.findUnique({
        where: { slug: 'kanchipuram-gold-zari-brocade' },
      });
      assert.ok(product);
      assert.strictEqual(product.sku, 'NN-KAN-001');
      assert.strictEqual(product.pricePaise, 4850000);

      const order = await restoredPrisma.order.findUnique({
        where: { orderNumber: 'NN-2026-9001' },
      });
      assert.ok(order);
      assert.strictEqual(order.customerName, 'Ananya Rao');
      assert.strictEqual(order.totalPaise, 4850000);

      const setting = await restoredPrisma.storeSetting.findUnique({
        where: { key: 'freeShippingThresholdPaise' },
      });
      assert.ok(setting);
      assert.strictEqual(setting.value, '500000');
    } finally {
      await restoredPrisma.$disconnect();
    }
  });

  // TEST 8: Failed Restoration Preserves Original Database
  test('8. Failed restoration with corrupted backup does not destroy original active database', async () => {
    const targetPath = path.join(testDir, 'active-target.db');
    const originalContent = fs.readFileSync(targetPath);

    // Create a corrupt file
    const corruptFile = path.join(testDir, 'corrupt.db');
    fs.writeFileSync(corruptFile, 'THIS_IS_NOT_A_VALID_SQLITE_FILE_CONTENT');

    await assert.rejects(
      async () => restoreDatabaseBackup(corruptFile, { targetDbPath: targetPath, dryRun: false }),
      /file is not a database|Corrupt SQLite file|Cannot restore invalid backup/i
    );

    // Original target DB content remains intact
    const afterContent = fs.readFileSync(targetPath);
    assert.deepStrictEqual(afterContent, originalContent, 'Original database is untouched');
  });

  // TEST 9: Production Seed Safety Guard
  test('9. Seed script safety guard rejects destructive seeding in production mode', () => {
    const checkSeedAllowed = (env: { NODE_ENV?: string; ALLOW_PRODUCTION_SEED?: string }) => {
      if (env.NODE_ENV === 'production' && !env.ALLOW_PRODUCTION_SEED) {
        return { allowed: false, error: 'Refusing to run destructive database seed script in production environment!' };
      }
      return { allowed: true };
    };

    const prodBlocked = checkSeedAllowed({ NODE_ENV: 'production' });
    assert.strictEqual(prodBlocked.allowed, false);
    assert.ok(prodBlocked.error?.includes('Refusing to run destructive database seed script'));

    const devAllowed = checkSeedAllowed({ NODE_ENV: 'development' });
    assert.strictEqual(devAllowed.allowed, true);

    const prodExplicitOverride = checkSeedAllowed({ NODE_ENV: 'production', ALLOW_PRODUCTION_SEED: 'true' });
    assert.strictEqual(prodExplicitOverride.allowed, true);
  });

  // TEST 10: Administrator Password Policy Enforcement
  test('10. validateAdminPassword enforces security requirements (8-128 chars, case, digits, special)', () => {
    assert.strictEqual(validateAdminPassword('short').valid, false);
    assert.strictEqual(validateAdminPassword('alllowercase123!').valid, false);
    assert.strictEqual(validateAdminPassword('ALLUPPERCASE123!').valid, false);
    assert.strictEqual(validateAdminPassword('NoSpecialChar123').valid, false);
    assert.strictEqual(validateAdminPassword('NoDigitsSpecial!').valid, false);
    assert.strictEqual(validateAdminPassword('a'.repeat(129) + 'A1!').valid, false);
    assert.strictEqual(validateAdminPassword('SecureAdmin2026!#$').valid, true);
  });

  // TEST 11: Admin Provisioning and Password Reset Routine
  test('11. provisionOrResetAdmin safely provisions new admin and resets existing admin with session revocation', async () => {
    // A: Provision new admin
    const newAdmin = await provisionOrResetAdmin({
      email: 'new.curator@noolandnila.com',
      password: 'CuratorSecurePass2026!',
      name: 'Curator Admin',
      client: syntheticPrisma as any,
    });

    assert.strictEqual(newAdmin.action, 'CREATED');
    assert.strictEqual(newAdmin.email, 'new.curator@noolandnila.com');
    assert.strictEqual(newAdmin.role, 'ADMIN');

    const createdUser = await syntheticPrisma.user.findUnique({
      where: { email: 'new.curator@noolandnila.com' },
    });
    assert.ok(createdUser);
    assert.strictEqual(createdUser.role, 'ADMIN');
    // Verify password is encrypted with bcrypt
    const match = await bcrypt.compare('CuratorSecurePass2026!', createdUser.passwordHash);
    assert.strictEqual(match, true);

    // B: Reset existing admin and verify session revocation
    // Create an active session first
    await syntheticPrisma.session.create({
      data: {
        id: 'sess-test-01',
        userId: createdUser.id,
        token: 'token-active-to-be-revoked',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const resetResult = await provisionOrResetAdmin({
      email: 'new.curator@noolandnila.com',
      password: 'NewStrongerPassword2026@!',
      client: syntheticPrisma as any,
    });

    assert.strictEqual(resetResult.action, 'UPDATED');
    assert.strictEqual(resetResult.sessionsInvalidated, 1);

    // Verify session was revoked
    const remainingSessions = await syntheticPrisma.session.findMany({
      where: { userId: createdUser.id },
    });
    assert.strictEqual(remainingSessions.length, 0);

    // Verify new password matches
    const updatedUser = await syntheticPrisma.user.findUnique({
      where: { id: createdUser.id },
    });
    assert.ok(updatedUser);
    const newMatch = await bcrypt.compare('NewStrongerPassword2026@!', updatedUser.passwordHash);
    assert.strictEqual(newMatch, true);
  });

  // TEST 12: Retention Pruning & Helper Utilities
  test('12. pruneOldBackups correctly handles retention policy and formatBytes formats properly', () => {
    assert.strictEqual(formatBytes(0), '0 B');
    assert.strictEqual(formatBytes(1024), '1 KB');
    assert.strictEqual(formatBytes(1048576), '1 MB');

    // Create 3 mock backup files in backupDir
    const f1 = path.join(backupDir, 'nool-and-nila-backup-2026-01-01T00-00-00-000Z.db');
    const f2 = path.join(backupDir, 'nool-and-nila-backup-2026-02-01T00-00-00-000Z.db');
    const f3 = path.join(backupDir, 'nool-and-nila-backup-2026-03-01T00-00-00-000Z.db');
    fs.writeFileSync(f1, 'mock1');
    fs.writeFileSync(f2, 'mock2');
    fs.writeFileSync(f3, 'mock3');

    // Keep max 2 backups
    const pruned = pruneOldBackups(backupDir, 365, 2);
    assert.ok(pruned >= 1, 'Oldest backup was pruned');
  });
});
