import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { compareSchemas } from '../scripts/verify-schema-drift.js';

test('Issue C: Prisma Migration Baselining and Schema Drift Safety', async (t) => {
  const scratchDir = path.resolve(process.cwd(), 'scratch', 'migration-tests');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const baselineDbPath = path.resolve(scratchDir, `baseline-fresh-${Date.now()}.db`);
  const existingDbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');

  t.after(() => {
    try {
      if (fs.existsSync(scratchDir)) {
        fs.rmSync(scratchDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  await t.test('1. Fresh database deploys initial migration cleanly with 18 tables', async () => {
    const normBaseline = baselineDbPath.replace(/\\/g, '/');
    const output = execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: `file:${normBaseline}`,
      },
      stdio: 'pipe',
    }).toString();

    assert.match(output, /1 migration/);
    assert.ok(fs.existsSync(baselineDbPath), 'Fresh database file was created');
  });

  await t.test('2. Existing dev.db has 0 schema drift compared to baseline migration', async () => {
    const comparison = await compareSchemas(existingDbPath, baselineDbPath);
    assert.strictEqual(comparison.isIdentical, true, 'dev.db schema is completely identical to baseline');
    assert.strictEqual(comparison.differences.length, 0, `Expected 0 differences, found: ${comparison.differences.join('; ')}`);
    assert.strictEqual(comparison.tableCount, 18, 'Expected 18 application tables');
  });

  await t.test('3. Schema drift detection correctly identifies unmigrated or altered columns', async () => {
    // Create a modified copy with an extra column
    const driftedDbPath = path.resolve(scratchDir, `drifted-${Date.now()}.db`);
    fs.copyFileSync(baselineDbPath, driftedDbPath);

    const normDrifted = driftedDbPath.replace(/\\/g, '/');
    const tempClient = new PrismaClient({
      datasourceUrl: `file:${normDrifted}`,
    });

    try {
      await tempClient.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "unmigratedTestColumn" TEXT;`);
    } finally {
      await tempClient.$disconnect();
    }

    const driftComparison = await compareSchemas(driftedDbPath, baselineDbPath);
    assert.strictEqual(driftComparison.isIdentical, false, 'Drift detection must flag unexpected schema alteration');
    assert.ok(
      driftComparison.differences.some((d) => d.includes('unmigratedTestColumn')),
      'Drift comparison must pinpoint the exact drifted column'
    );
  });
});
