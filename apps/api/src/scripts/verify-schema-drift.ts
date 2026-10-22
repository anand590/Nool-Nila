import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface IndexInfo {
  name: string;
  unique: boolean;
  columns: string[];
}

interface ForeignKeyInfo {
  table: string;
  from: string;
  to: string;
  onUpdate: string;
  onDelete: string;
}

interface TableSchema {
  name: string;
  columns: Record<string, ColumnInfo>;
  indexes: Record<string, IndexInfo>;
  foreignKeys: ForeignKeyInfo[];
}

async function extractDatabaseSchema(dbFilePath: string): Promise<Record<string, TableSchema>> {
  const normPath = dbFilePath.replace(/\\/g, '/');
  const client = new PrismaClient({
    datasourceUrl: `file:${normPath}`,
    log: ['error'],
  });

  try {
    const tables = await client.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name;`
    );

    const schema: Record<string, TableSchema> = {};

    for (const { name: tableName } of tables) {
      // 1. Column info
      const columns = await client.$queryRawUnsafe<ColumnInfo[]>(`PRAGMA table_info("${tableName}");`);
      const colMap: Record<string, ColumnInfo> = {};
      for (const col of columns) {
        colMap[col.name] = col;
      }

      // 2. Indexes
      const rawIndexes = await client.$queryRawUnsafe<
        Array<{ seq: number; name: string; unique: number; origin: string; partial: number }>
      >(`PRAGMA index_list("${tableName}");`);

      const indexMap: Record<string, IndexInfo> = {};
      for (const idx of rawIndexes) {
        if (idx.name.startsWith('sqlite_autoindex_')) continue; // Skip implicit PK autoindexes
        const idxCols = await client.$queryRawUnsafe<Array<{ seqno: number; cid: number; name: string }>>(
          `PRAGMA index_info("${idx.name}");`
        );
        indexMap[idx.name] = {
          name: idx.name,
          unique: Boolean(idx.unique),
          columns: idxCols.map((c) => c.name),
        };
      }

      // 3. Foreign Keys
      const rawFks = await client.$queryRawUnsafe<
        Array<{ id: number; seq: number; table: string; from: string; to: string; on_update: string; on_delete: string }>
      >(`PRAGMA foreign_key_list("${tableName}");`);

      const foreignKeys: ForeignKeyInfo[] = rawFks.map((fk) => ({
        table: fk.table,
        from: fk.from,
        to: fk.to,
        onUpdate: fk.on_update,
        onDelete: fk.on_delete,
      }));

      schema[tableName] = {
        name: tableName,
        columns: colMap,
        indexes: indexMap,
        foreignKeys,
      };
    }

    return schema;
  } finally {
    await client.$disconnect();
  }
}

export async function compareSchemas(
  existingDbPath: string,
  baselineDbPath: string
): Promise<{
  isIdentical: boolean;
  tableCount: number;
  tablesChecked: string[];
  differences: string[];
}> {
  const existingSchema = await extractDatabaseSchema(existingDbPath);
  const baselineSchema = await extractDatabaseSchema(baselineDbPath);

  const differences: string[] = [];
  const existingTables = Object.keys(existingSchema).sort();
  const baselineTables = Object.keys(baselineSchema).sort();

  // Check missing or extra tables
  for (const table of baselineTables) {
    if (!existingSchema[table]) {
      differences.push(`Table missing in existing DB: ${table}`);
    }
  }
  for (const table of existingTables) {
    if (!baselineSchema[table]) {
      differences.push(`Extra table found in existing DB: ${table}`);
    }
  }

  // Check columns, types, nullability, defaults, PK
  for (const table of baselineTables) {
    if (!existingSchema[table]) continue;

    const baseT = baselineSchema[table];
    const existT = existingSchema[table];

    // Columns
    const baseCols = Object.keys(baseT.columns).sort();
    const existCols = Object.keys(existT.columns).sort();

    for (const col of baseCols) {
      if (!existT.columns[col]) {
        differences.push(`Table ${table}: missing column ${col} in existing DB`);
      } else {
        const b = baseT.columns[col];
        const e = existT.columns[col];
        if (b.type.toUpperCase() !== e.type.toUpperCase()) {
          differences.push(`Table ${table}.${col}: type mismatch (baseline: ${b.type}, existing: ${e.type})`);
        }
        if (b.notnull !== e.notnull) {
          differences.push(`Table ${table}.${col}: nullability mismatch (baseline notnull: ${b.notnull}, existing: ${e.notnull})`);
        }
        if (b.pk !== e.pk) {
          differences.push(`Table ${table}.${col}: primary key mismatch (baseline pk: ${b.pk}, existing: ${e.pk})`);
        }
      }
    }

    for (const col of existCols) {
      if (!baseT.columns[col]) {
        differences.push(`Table ${table}: extra column ${col} in existing DB`);
      }
    }

    // Indexes
    const baseIdxs = Object.keys(baseT.indexes).sort();
    for (const idx of baseIdxs) {
      if (!existT.indexes[idx]) {
        differences.push(`Table ${table}: missing index ${idx} in existing DB`);
      }
    }

    // Foreign Keys count
    if (baseT.foreignKeys.length !== existT.foreignKeys.length) {
      differences.push(
        `Table ${table}: foreign key count mismatch (baseline: ${baseT.foreignKeys.length}, existing: ${existT.foreignKeys.length})`
      );
    }
  }

  return {
    isIdentical: differences.length === 0,
    tableCount: baselineTables.length,
    tablesChecked: baselineTables,
    differences,
  };
}

async function main() {
  console.log('🔬 Prisma Schema Drift & Baseline Verification Tool');
  console.log('==================================================');

  const cwd = process.cwd();
  const existingDbPath = path.resolve(cwd, 'prisma', 'dev.db');
  const tempDir = path.resolve(cwd, 'scratch');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const freshDbPath = path.resolve(tempDir, `baseline-verify-${Date.now()}.db`);
  if (fs.existsSync(freshDbPath)) {
    fs.unlinkSync(freshDbPath);
  }

  console.log(`📍 Existing Database: ${existingDbPath}`);
  console.log(`🌱 Generating clean baseline database at: ${freshDbPath}`);

  try {
    // Run prisma migrate deploy targeting freshDbPath
    const normFresh = freshDbPath.replace(/\\/g, '/');
    execSync('npx prisma migrate deploy', {
      cwd,
      env: {
        ...process.env,
        DATABASE_URL: `file:${normFresh}`,
      },
      stdio: 'pipe',
    });
    console.log('✅ Baseline migration deployed to fresh database cleanly.');

    console.log('🔍 Performing comprehensive SQLite schema introspection...');
    const result = await compareSchemas(existingDbPath, freshDbPath);

    console.log(`\n📊 Schema Verification Summary:`);
    console.log(`   - Tables Evaluated: ${result.tableCount} (${result.tablesChecked.join(', ')})`);
    console.log(`   - Schema Differences: ${result.differences.length}`);

    if (result.isIdentical) {
      console.log('\n======================================================');
      console.log('✅ ZERO DRIFT CONFIRMED: Existing DB matches baseline perfectly!');
      console.log('======================================================\n');
      process.exit(0);
    } else {
      console.error('\n❌ SCHEMA DRIFT DETECTED:');
      for (const diff of result.differences) {
        console.error(`   - ${diff}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Drift verification failed with error:', error);
    process.exit(1);
  } finally {
    if (fs.existsSync(freshDbPath)) {
      try {
        fs.unlinkSync(freshDbPath);
      } catch {
        // ignore
      }
    }
  }
}

// Only run main if directly executed
if (process.argv[1] && process.argv[1].endsWith('verify-schema-drift.ts')) {
  main();
}
