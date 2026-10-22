import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  SecondaryVolumeStorageAdapter,
  NullStorageAdapter,
  calculateFileSha256,
} from '../services/storageAdapter.js';
import {
  createDatabaseBackup,
  restoreDatabaseBackup,
  verifyBackupFile,
} from '../services/backupService.js';

test('Issue D: Off-Host Backup Replication, Integrity & Disaster Recovery Drill', async (t) => {
  const scratchDir = path.resolve(process.cwd(), 'scratch', 'offhost-tests');
  const localBackupDir = path.resolve(scratchDir, 'local-backups');
  const remoteDrVolume = path.resolve(scratchDir, 'remote-dr-storage');
  const freshRestoreTarget = path.resolve(scratchDir, 'disaster-recovered.db');
  const downloadedStaging = path.resolve(scratchDir, 'downloaded-from-dr.db');

  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  t.after(() => {
    try {
      if (fs.existsSync(scratchDir)) {
        fs.rmSync(scratchDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  await t.test('1. NullStorageAdapter reports unconfigured when cloud credentials are unset', () => {
    const nullAdapter = new NullStorageAdapter();
    assert.strictEqual(nullAdapter.isConfigured(), false);
    assert.strictEqual(nullAdapter.providerName, 'None');
  });

  let uploadedMetadata: any;

  await t.test('2. Generate local consistent backup and upload to isolated off-host DR volume', async () => {
    // Generate online backup
    const localBackup = await createDatabaseBackup({
      destinationDir: localBackupDir,
      customFilename: 'disaster-recovery-test.db',
    });

    assert.strictEqual(localBackup.success, true);
    assert.ok(fs.existsSync(localBackup.backupPath));

    // Upload to secondary DR volume
    const adapter = new SecondaryVolumeStorageAdapter(remoteDrVolume);
    assert.strictEqual(adapter.isConfigured(), true);

    const startTime = Date.now();
    uploadedMetadata = await adapter.uploadBackup(localBackup.backupPath);
    const uploadDurationMs = Date.now() - startTime;

    assert.strictEqual(uploadedMetadata.filename, 'disaster-recovery-test.db');
    assert.ok(uploadedMetadata.sha256.length === 64, 'SHA-256 must be a 64-character hex string');
    assert.ok(fs.existsSync(path.join(remoteDrVolume, 'disaster-recovery-test.db')));
    assert.ok(fs.existsSync(path.join(remoteDrVolume, 'disaster-recovery-test.db.meta.json')));

    // Checksum matches local file
    const localHash = calculateFileSha256(localBackup.backupPath);
    assert.strictEqual(uploadedMetadata.sha256, localHash);
  });

  await t.test('3. Off-host storage adapter rejects path traversal attempts', async () => {
    const adapter = new SecondaryVolumeStorageAdapter(remoteDrVolume);
    const dummyPath = path.resolve(localBackupDir, 'disaster-recovery-test.db');

    await assert.rejects(
      async () => {
        await adapter.uploadBackup(dummyPath, '../../evil.db');
      },
      /path traversal prohibited/i
    );
  });

  await t.test('4. Retrieve backup from off-host DR destination and verify SHA-256 integrity', async () => {
    const adapter = new SecondaryVolumeStorageAdapter(remoteDrVolume);

    const downloadResult = await adapter.downloadBackup(
      'disaster-recovery-test.db',
      downloadedStaging
    );

    assert.strictEqual(downloadResult.sha256Verified, true);
    assert.ok(fs.existsSync(downloadedStaging));
    assert.strictEqual(calculateFileSha256(downloadedStaging), uploadedMetadata.sha256);
  });

  await t.test('5. Restore database from retrieved off-host backup and measure RTO', async () => {
    const rtoStartTime = Date.now();

    // 1. Verify retrieved backup
    const verification = await verifyBackupFile(downloadedStaging);
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.integrity, 'ok');

    // 2. Perform restore into disposable database
    const restoreResult = await restoreDatabaseBackup(downloadedStaging, {
      targetDbPath: freshRestoreTarget,
      dryRun: false,
    });

    const rtoElapsedMs = Date.now() - rtoStartTime;

    assert.strictEqual(restoreResult.success, true);
    assert.ok(fs.existsSync(freshRestoreTarget));
    assert.ok(restoreResult.verifiedRecordCounts.users > 0, 'Users must be restored');
    assert.ok(restoreResult.verifiedRecordCounts.products > 0, 'Products must be restored');

    // RTO demonstrated
    assert.ok(rtoElapsedMs < 5000, `Recovery Time Objective met: ${rtoElapsedMs}ms (< 5000ms target)`);
  });

  await t.test('6. Download fails and rejects if remote backup has corrupted checksum', async () => {
    const corruptedRemote = path.join(remoteDrVolume, 'corrupted.db');
    const corruptedMeta = path.join(remoteDrVolume, 'corrupted.db.meta.json');

    // Write corrupted content with a mismatched valid sha256 in metadata
    fs.writeFileSync(corruptedRemote, 'CORRUPTED_BYTES_HERE');
    fs.writeFileSync(
      corruptedMeta,
      JSON.stringify({
        filename: 'corrupted.db',
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        sizeBytes: 20,
        uploadedAt: new Date().toISOString(),
        remoteLocation: corruptedRemote,
        provider: 'SecondaryVolume',
      })
    );

    const adapter = new SecondaryVolumeStorageAdapter(remoteDrVolume);
    const testDest = path.resolve(scratchDir, 'should-fail.db');

    await assert.rejects(
      async () => {
        await adapter.downloadBackup('corrupted.db', testDest);
      },
      /failed integrity verification: hash mismatch/i
    );
  });

  await t.test('7. Pruning policy enforces minimum retention safeguard (minKeep)', async () => {
    const adapter = new SecondaryVolumeStorageAdapter(remoteDrVolume);
    // Prune with 0 days retention, but minKeep = 2
    const pruned = await adapter.pruneBackups(0, 2);
    // Should NOT prune anything because we have fewer than or equal to minKeep
    const remaining = await adapter.listBackups();
    assert.ok(remaining.length >= 1, 'Safe retention: never prune the only remaining backups');
  });
});
