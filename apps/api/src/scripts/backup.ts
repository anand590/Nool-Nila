import path from 'path';
import { createDatabaseBackup } from '../services/backupService.js';
import { getBackupStorageAdapter } from '../services/storageAdapter.js';
import { prisma } from '../config/prisma.js';

async function main() {
  console.log('📦 Starting Nool & Nila SQLite database backup...');

  // Parse CLI args (e.g., --dest=/var/backups --retention=30 --replicate-to=/mnt/dr)
  const args = process.argv.slice(2);
  let destDir: string | undefined;
  let retentionDays: number | undefined;
  let customReplicateDir: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--dest=')) {
      destDir = path.resolve(arg.replace('--dest=', ''));
    } else if (arg.startsWith('--retention=')) {
      retentionDays = parseInt(arg.replace('--retention=', ''), 10);
    } else if (arg.startsWith('--replicate-to=')) {
      customReplicateDir = path.resolve(arg.replace('--replicate-to=', ''));
    }
  }

  try {
    const result = await createDatabaseBackup({
      destinationDir: destDir,
      retentionDays,
    });

    console.log('\n======================================================');
    console.log('✅ DATABASE BACKUP CREATED SUCCESSFULLY');
    console.log('======================================================');
    console.log(`📁 File:        ${result.backupFilename}`);
    console.log(`📍 Path:        ${result.backupPath}`);
    console.log(`⚖️ Size:        ${result.sizeFormatted} (${result.sizeBytes} bytes)`);
    console.log(`🕒 Timestamp:   ${result.timestamp}`);
    console.log(`🛡️ Integrity:   ${result.integrity.toUpperCase()}`);

    // Check off-host disaster recovery replication
    const adapter = getBackupStorageAdapter(customReplicateDir);
    if (adapter.isConfigured()) {
      console.log('------------------------------------------------------');
      console.log(`🌐 Replicating backup to off-host destination (${adapter.providerName})...`);
      const offHostMeta = await adapter.uploadBackup(result.backupPath);
      console.log(`✅ Off-host copy confirmed at: ${offHostMeta.remoteLocation}`);
      console.log(`🔐 SHA-256 Checksum:         ${offHostMeta.sha256}`);
    } else {
      console.log('------------------------------------------------------');
      console.log('ℹ️ Off-host replication: NOT CONFIGURED');
      console.log('   (Set OFF_HOST_BACKUP_DIR or cloud S3 credentials to enable off-host DR copies)');
    }
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ ERROR: Database backup failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
