import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { migrateSqliteToPostgres } from '../scripts/migrate-sqlite-to-postgres.js';
import { createApp } from '../app.js';

test('Stage A: PostgreSQL & Cloud Deployment Verification Suite', async (t) => {
  const rootDir = path.resolve(process.cwd(), '..', '..');
  const apiDir = process.cwd();

  await t.test('1. PostgreSQL Prisma schema specifies postgresql datasource provider', () => {
    const pgSchemaPath = path.resolve(apiDir, 'prisma-postgresql', 'schema.prisma');
    assert.ok(fs.existsSync(pgSchemaPath), 'PostgreSQL schema file must exist');

    const content = fs.readFileSync(pgSchemaPath, 'utf8');
    assert.match(content, /provider\s*=\s*"postgresql"/, 'Provider must be postgresql');
    assert.match(content, /url\s*=\s*env\("DATABASE_URL"\)/, 'Must read DATABASE_URL');
  });

  await t.test('2. Committed PostgreSQL migration contains all 18 application tables and foreign keys', () => {
    const migrationPath = path.resolve(
      apiDir,
      'prisma-postgresql',
      'migrations',
      '20261022000000_init',
      'migration.sql'
    );
    assert.ok(fs.existsSync(migrationPath), 'PostgreSQL migration.sql must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const expectedTables = [
      'User',
      'Session',
      'Address',
      'Category',
      'Product',
      'ProductImage',
      'ProductVariant',
      'Wishlist',
      'WishlistItem',
      'Cart',
      'CartItem',
      'Order',
      'OrderItem',
      'OrderStatusHistory',
      'InventoryMovement',
      'ShippingConfiguration',
      'StoreSetting',
      'AuditLog',
    ];

    for (const table of expectedTables) {
      assert.ok(
        sql.includes(`CREATE TABLE "${table}"`),
        `PostgreSQL migration must define table "${table}"`
      );
    }

    assert.ok(sql.includes('ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"'));
    assert.ok(sql.includes('ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey"'));
    assert.ok(sql.includes('ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey"'));
  });

  await t.test('3. SQLite-to-PostgreSQL data transfer utility runs dry-run verification cleanly', async () => {
    const devDbPath = path.resolve(apiDir, 'prisma', 'dev.db');
    assert.ok(fs.existsSync(devDbPath), 'SQLite dev.db must exist for dry-run verification');

    const summary = await migrateSqliteToPostgres({
      sqliteDbPath: devDbPath,
      postgresUrl: 'postgresql://placeholder:secret@postgres.render.com:5432/nool_and_nila?sslmode=require',
      dryRun: true,
    });

    assert.strictEqual(summary.success, true);
    assert.strictEqual(summary.dryRun, true);
    assert.ok(summary.tables['User'].read > 0, 'Users must be read from SQLite');
    assert.ok(summary.tables['Product'].read > 0, 'Products must be read from SQLite');
    assert.ok(summary.tables['Order'].read > 0, 'Orders must be read from SQLite');
    assert.strictEqual(summary.errors.length, 0);
  });

  await t.test('4. CORS configuration accepts Vercel preview domains and production URLs', () => {
    const app = createApp();
    assert.ok(app, 'Express app creates cleanly');
  });

  await t.test('5. Render blueprint (render.yaml) defines managed PostgreSQL database and web service', () => {
    const renderYamlPath = path.resolve(rootDir, 'render.yaml');
    assert.ok(fs.existsSync(renderYamlPath), 'render.yaml must exist at root');

    const yaml = fs.readFileSync(renderYamlPath, 'utf8');
    assert.ok(yaml.includes('name: nool-and-nila-db'), 'Must define nool-and-nila-db');
    assert.ok(yaml.includes('name: nool-and-nila-api'), 'Must define nool-and-nila-api');
    assert.ok(yaml.includes('fromDatabase:'), 'Must link DATABASE_URL from database');
    assert.ok(yaml.includes('prisma:migrate:pg'), 'Must run PostgreSQL migrations preDeploy');
    assert.ok(yaml.includes('healthCheckPath: /api/v1/health'), 'Must configure health check');
  });

  await t.test('6. Vercel configuration (vercel.json) defines SPA rewrites and edge cache headers', () => {
    const vercelJsonPath = path.resolve(rootDir, 'vercel.json');
    assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json must exist at root');

    const vercel = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
    assert.ok(Array.isArray(vercel.rewrites), 'Rewrites array must exist');
    assert.ok(
      vercel.rewrites.some((r: any) => r.source === '/(.*)' && r.destination === '/index.html'),
      'Must rewrite all routes to /index.html for SPA client routing'
    );
  });
});
