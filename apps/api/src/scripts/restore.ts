import fs from 'fs';
import path from 'path';
import {
  verifyBackupFile,
  restoreDatabaseBackup,
  resolveSqlitePath,
  enableMaintenanceMode,
  disableMaintenanceMode,
  isPortListening,
} from '../services/backupService.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let backupFile: string | undefined;
  let targetDb: string | undefined;
  let dryRun = false;
  let force = false;
  let requireStopped = false;

  for (const arg of args) {
    if (arg.startsWith('--file=')) {
      backupFile = path.resolve(arg.replace('--file=', ''));
    } else if (arg.startsWith('--target=')) {
      targetDb = path.resolve(arg.replace('--target=', ''));
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force' || arg === '--yes' || arg === '-y') {
      force = true;
    } else if (arg === '--require-stopped' || arg === '--verify-stopped') {
      requireStopped = true;
    }
  }

  console.log('🔄 Nool & Nila Database Restoration Utility');
  console.log('============================================');

  if (!backupFile) {
    console.error('❌ Error: Missing required --file parameter.');
    console.log('\nUsage:');
    console.log('  npx tsx src/scripts/restore.ts --file=<path-to-backup.db> [--dry-run] [--force] [--require-stopped]');
    console.log('  npm run db:restore -- --file=<path-to-backup.db> [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Error: Backup file not found at: ${backupFile}`);
    process.exit(1);
  }

  const activeDbPath = targetDb || resolveSqlitePath(process.env.DATABASE_URL || 'file:./dev.db');

  console.log(`📂 Source Backup:    ${backupFile}`);
  console.log(`🎯 Target DB:        ${activeDbPath}`);
  console.log(`🧪 Mode:             ${dryRun ? 'DRY-RUN (Validation only)' : 'LIVE RESTORATION'}`);
  console.log('--------------------------------------------');

  let maintenanceModeSet = false;

  try {
    // 1. Pre-restoration verification of backup file
    console.log('🔍 Step 1: Validating backup file format and SQLite internal integrity...');
    const verification = await verifyBackupFile(backupFile);

    if (!verification.isValid) {
      console.error(`❌ Validation failed: ${verification.message}`);
      process.exit(1);
    }

    console.log('✅ SQLite integrity verified: OK');
    console.log('📊 Table Record Summary in Backup:');
    console.log(`   - Users:          ${verification.recordCounts.users}`);
    console.log(`   - Categories:     ${verification.recordCounts.categories}`);
    console.log(`   - Products:       ${verification.recordCounts.products}`);
    console.log(`   - Orders:         ${verification.recordCounts.orders}`);
    console.log(`   - Store Settings: ${verification.recordCounts.storeSettings}`);

    if (dryRun) {
      console.log('\n✨ DRY RUN COMPLETE: Backup is valid and fully restorable.');
      process.exit(0);
    }

    // 2. Process & Concurrency Inspection
    console.log('\n🔍 Step 2: Inspecting active API process status & concurrency state...');
    const isApiActive = await isPortListening(config.port);

    if (isApiActive) {
      console.log(`⚠️ Active API process detected listening on port ${config.port}.`);
      if (requireStopped) {
        console.error(`❌ Restoration halted: --require-stopped flag is set and API process is actively listening.`);
        console.error(`Please halt the API service (e.g., pm2 stop / docker stop) before retrying cutover.`);
        process.exit(1);
      }
    } else {
      console.log(`✅ No active API listener on port ${config.port}. Process is verified stopped.`);
    }

    // Safety confirmation check for live restore in production
    if (!force && process.env.NODE_ENV === 'production') {
      console.error('\n⚠️ WARNING: Live restoration in production requires explicit confirmation.');
      console.error('Please re-run with --force to confirm intentional restoration cutover.');
      process.exit(1);
    }

    // 3. Maintenance mode & request draining
    console.log('\n🚧 Step 3: Activating maintenance window & draining in-flight requests...');
    enableMaintenanceMode();
    maintenanceModeSet = true;

    if (isApiActive) {
      console.log('⏳ Waiting 1500ms for in-flight HTTP requests to drain under maintenance mode (HTTP 503)...');
      await sleep(1500);
    }

    await prisma.$disconnect();

    // 4. Execution of atomic restoration
    console.log('\n🚀 Step 4: Executing atomic database restoration and verifying integrity...');
    const restoreResult = await restoreDatabaseBackup(backupFile, {
      targetDbPath: activeDbPath,
      dryRun: false,
    });

    console.log('\n======================================================');
    console.log('✅ DATABASE RESTORATION COMPLETED SUCCESSFULLY');
    console.log('======================================================');
    console.log(`📍 Active DB Path:       ${restoreResult.targetDbPath}`);
    if (restoreResult.preRestoreBackupPath) {
      console.log(`🛡️ Pre-Restore Safety Bak: ${restoreResult.preRestoreBackupPath}`);
    }
    console.log('------------------------------------------------------');
    console.log('✨ Records active in restored database:');
    for (const [table, count] of Object.entries(restoreResult.verifiedRecordCounts)) {
      console.log(`   - ${table.padEnd(16)}: ${count}`);
    }
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ ERROR: Database restoration failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (maintenanceModeSet) {
      disableMaintenanceMode();
      console.log('✨ Maintenance window closed. Service resumed.');
    }
    await prisma.$disconnect();
  }
}

main();
