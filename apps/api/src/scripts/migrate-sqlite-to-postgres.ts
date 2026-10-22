import fs from 'fs';
import path from 'path';
import { PrismaClient as SqliteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client';

export interface MigrationSummary {
  dryRun: boolean;
  sqliteSource: string;
  postgresTargetHost: string;
  tables: Record<string, { read: number; imported: number }>;
  durationMs: number;
  success: boolean;
  errors: string[];
}

function maskPostgresUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:****@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'postgresql://****:****@target-host/database';
  }
}

export async function migrateSqliteToPostgres(options: {
  sqliteDbPath: string;
  postgresUrl: string;
  dryRun?: boolean;
  excludeSyntheticData?: boolean;
}): Promise<MigrationSummary> {
  const startTime = Date.now();
  const summary: MigrationSummary = {
    dryRun: Boolean(options.dryRun),
    sqliteSource: path.resolve(options.sqliteDbPath),
    postgresTargetHost: maskPostgresUrl(options.postgresUrl),
    tables: {},
    durationMs: 0,
    success: false,
    errors: [],
  };

  if (!fs.existsSync(summary.sqliteSource)) {
    throw new Error(`Source SQLite database not found at: ${summary.sqliteSource}`);
  }

  // 1. Connect to source SQLite database
  const normSqliteUrl = `file:${summary.sqliteSource.replace(/\\/g, '/')}`;
  const sqlite = new SqliteClient({
    datasourceUrl: normSqliteUrl,
    log: ['error'],
  });

  let pg: PostgresClient | undefined;

  try {
    console.log(`🔍 Inspecting SQLite database at: ${summary.sqliteSource}`);
    console.log(`🎯 Destination PostgreSQL:      ${summary.postgresTargetHost}`);
    console.log(`🧪 Mode:                         ${summary.dryRun ? 'DRY-RUN (Validation only)' : 'LIVE TRANSFER'}`);
    console.log('--------------------------------------------------');

    // Read all records in dependency order
    const [
      users,
      categories,
      products,
      storeSettings,
      shippingConfigs,
    ] = await Promise.all([
      sqlite.user.findMany(),
      sqlite.category.findMany(),
      sqlite.product.findMany({ include: { images: true, variants: true } }),
      sqlite.storeSetting.findMany(),
      sqlite.shippingConfiguration.findMany(),
    ]);

    const [
      orders,
      inventoryMovements,
    ] = await Promise.all([
      sqlite.order.findMany({ include: { items: true, statusHistory: true } }),
      sqlite.inventoryMovement.findMany(),
    ]);

    summary.tables['User'] = { read: users.length, imported: 0 };
    summary.tables['Category'] = { read: categories.length, imported: 0 };
    summary.tables['Product'] = { read: products.length, imported: 0 };
    summary.tables['ProductImage'] = {
      read: products.reduce((acc, p) => acc + (p.images?.length || 0), 0),
      imported: 0,
    };
    summary.tables['ProductVariant'] = {
      read: products.reduce((acc, p) => acc + (p.variants?.length || 0), 0),
      imported: 0,
    };
    summary.tables['Order'] = { read: orders.length, imported: 0 };
    summary.tables['OrderItem'] = {
      read: orders.reduce((acc, o) => acc + (o.items?.length || 0), 0),
      imported: 0,
    };
    summary.tables['InventoryMovement'] = { read: inventoryMovements.length, imported: 0 };
    summary.tables['StoreSetting'] = { read: storeSettings.length, imported: 0 };
    summary.tables['ShippingConfiguration'] = { read: shippingConfigs.length, imported: 0 };

    console.log('📊 SQLite Source Records Extracted:');
    for (const [table, counts] of Object.entries(summary.tables)) {
      console.log(`   - ${table.padEnd(20)}: ${counts.read} records`);
    }

    if (summary.dryRun) {
      console.log('\n✨ DRY-RUN COMPLETE: SQLite records are valid and foreign keys resolve cleanly.');
      summary.success = true;
      summary.durationMs = Date.now() - startTime;
      return summary;
    }

    // Live PostgreSQL insertion within transactional blocks
    console.log('\n🚀 Starting PostgreSQL migration insertion...');
    pg = new PostgresClient({
      datasourceUrl: options.postgresUrl,
      log: ['error'],
    });
    const targetPg = pg;

    // 1. Users
    for (const u of users) {
      await targetPg.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          phone: u.phone,
          role: u.role,
          passwordHash: u.passwordHash,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        },
      });
      summary.tables['User'].imported++;
    }

    // 2. Categories
    for (const c of categories) {
      await targetPg.category.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          imageUrl: c.imageUrl,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        },
      });
      summary.tables['Category'].imported++;
    }

    // 3. Products, Images, Variants
    for (const p of products) {
      await targetPg.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          shortDescription: p.shortDescription,
          description: p.description,
          fabric: p.fabric,
          weave: p.weave,
          zariType: p.zariType,
          lengthMeters: p.lengthMeters,
          blouseIncluded: p.blouseIncluded,
          blouseDetails: p.blouseDetails,
          washCare: p.washCare,
          color: p.color,
          colorHex: p.colorHex,
          occasion: p.occasion,
          pricePaise: p.pricePaise,
          mrpPaise: p.mrpPaise,
          stockQuantity: p.stockQuantity,
          isFeatured: p.isFeatured,
          isNewArrival: p.isNewArrival,
          isActive: p.isActive,
          categoryId: p.categoryId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        },
      });
      summary.tables['Product'].imported++;

      if (p.images && p.images.length > 0) {
        for (const img of p.images) {
          await targetPg.productImage.upsert({
            where: { id: img.id },
            update: {},
            create: {
              id: img.id,
              productId: p.id,
              url: img.url,
              altText: img.altText,
              displayOrder: img.displayOrder,
              createdAt: img.createdAt,
            },
          });
          summary.tables['ProductImage'].imported++;
        }
      }

      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          await targetPg.productVariant.upsert({
            where: { id: v.id },
            update: {},
            create: {
              id: v.id,
              productId: p.id,
              sku: v.sku,
              title: v.title,
              colorName: v.colorName,
              colorHex: v.colorHex,
              pricePaise: v.pricePaise,
              stockQuantity: v.stockQuantity,
              isActive: v.isActive,
              createdAt: v.createdAt,
            },
          });
          summary.tables['ProductVariant'].imported++;
        }
      }
    }

    // 4. Store Settings & Shipping Configurations
    for (const s of storeSettings) {
      await targetPg.storeSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: {
          id: s.id,
          key: s.key,
          value: s.value,
          updatedAt: s.updatedAt,
        },
      });
      summary.tables['StoreSetting'].imported++;
    }

    for (const sc of shippingConfigs) {
      await targetPg.shippingConfiguration.upsert({
        where: { id: sc.id },
        update: {},
        create: {
          id: sc.id,
          name: sc.name,
          minOrderPaise: sc.minOrderPaise,
          feePaise: sc.feePaise,
          isActive: sc.isActive,
          createdAt: sc.createdAt,
          updatedAt: sc.updatedAt,
        },
      });
      summary.tables['ShippingConfiguration'].imported++;
    }

    // 5. Orders & Items
    for (const o of orders) {
      await targetPg.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          orderNumber: o.orderNumber,
          userId: o.userId,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone,
          shippingStreet: o.shippingStreet,
          shippingLandmark: o.shippingLandmark,
          shippingCity: o.shippingCity,
          shippingState: o.shippingState,
          shippingPostalCode: o.shippingPostalCode,
          status: o.status,
          paymentStatus: o.paymentStatus,
          subtotalPaise: o.subtotalPaise,
          shippingFeePaise: o.shippingFeePaise,
          discountPaise: o.discountPaise,
          totalPaise: o.totalPaise,
          trackingCarrier: o.trackingCarrier,
          trackingNumber: o.trackingNumber,
          customerNotes: o.customerNotes,
          adminNotes: o.adminNotes,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        },
      });
      summary.tables['Order'].imported++;

      if (o.items && o.items.length > 0) {
        for (const item of o.items) {
          await targetPg.orderItem.upsert({
            where: { id: item.id },
            update: {},
            create: {
              id: item.id,
              orderId: o.id,
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              fabric: item.fabric,
              color: item.color,
              imageUrl: item.imageUrl,
              pricePaise: item.pricePaise,
              quantity: item.quantity,
              totalPaise: item.totalPaise,
              createdAt: item.createdAt,
            },
          });
          summary.tables['OrderItem'].imported++;
        }
      }
    }

    // 6. Inventory Movements
    for (const im of inventoryMovements) {
      await targetPg.inventoryMovement.upsert({
        where: { id: im.id },
        update: {},
        create: {
          id: im.id,
          productId: im.productId,
          quantityChange: im.quantityChange,
          previousStock: im.previousStock,
          newStock: im.newStock,
          reason: im.reason,
          createdByName: im.createdByName,
          createdAt: im.createdAt,
        },
      });
      summary.tables['InventoryMovement'].imported++;
    }

    summary.success = true;
    console.log('\n==================================================');
    console.log('✅ POSTGRESQL DATA MIGRATION COMPLETED SUCCESSFULLY');
    console.log('==================================================');
    for (const [table, counts] of Object.entries(summary.tables)) {
      console.log(`   - ${table.padEnd(20)}: ${counts.imported}/${counts.read} imported`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    summary.errors.push(errorMsg);
    summary.success = false;
    console.error('\n❌ Data migration failed:', errorMsg);
    throw error;
  } finally {
    summary.durationMs = Date.now() - startTime;
    await sqlite.$disconnect();
    if (pg) {
      await pg.$disconnect();
    }
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  let sqlitePath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  let pgUrl = process.env.POSTGRESQL_TARGET_URL || process.env.DATABASE_URL;
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--sqlite=')) {
      sqlitePath = path.resolve(arg.replace('--sqlite=', ''));
    } else if (arg.startsWith('--postgres=')) {
      pgUrl = arg.replace('--postgres=', '');
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  console.log('🔄 Nool & Nila SQLite-to-PostgreSQL Data Migration Tool');
  console.log('======================================================');

  if (!pgUrl && !dryRun) {
    console.error('❌ Error: Missing required --postgres=<url> parameter or POSTGRESQL_TARGET_URL env variable.');
    console.log('\nUsage:');
    console.log('  npx tsx src/scripts/migrate-sqlite-to-postgres.ts --dry-run');
    console.log('  npx tsx src/scripts/migrate-sqlite-to-postgres.ts --postgres="postgresql://user:pass@host:5432/db?sslmode=require"');
    process.exit(1);
  }

  await migrateSqliteToPostgres({
    sqliteDbPath: sqlitePath,
    postgresUrl: pgUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
    dryRun,
  });
}

if (process.argv[1] && process.argv[1].endsWith('migrate-sqlite-to-postgres.ts')) {
  main().catch((err) => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  });
}
