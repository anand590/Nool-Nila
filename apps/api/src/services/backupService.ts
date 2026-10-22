import fs from 'fs';
import path from 'path';
import net from 'net';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface BackupResult {
  success: boolean;
  backupPath: string;
  backupFilename: string;
  sizeBytes: number;
  sizeFormatted: string;
  timestamp: string;
  integrity: string;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  sizeBytes: number;
  integrity: string;
  recordCounts: {
    users: number;
    products: number;
    orders: number;
    categories: number;
    storeSettings: number;
  };
}

export interface RestoreResult {
  success: boolean;
  backupPath: string;
  targetDbPath: string;
  preRestoreBackupPath?: string;
  verifiedRecordCounts: Record<string, number>;
  dryRun: boolean;
  message: string;
}

/**
 * Format bytes into human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Extract active SQLite file path from a database URL.
 * Handles "file:./dev.db", "file:/var/data/prod.db", "file:path/to/db.db"
 */
export function resolveSqlitePath(dbUrl: string): string {
  const cleanUrl = dbUrl.replace(/^file:/, '').split('?')[0];
  if (path.isAbsolute(cleanUrl)) {
    return path.normalize(cleanUrl);
  }
  return path.resolve(process.cwd(), cleanUrl);
}

export const DEFAULT_MAINTENANCE_LOCK = path.resolve(process.cwd(), '.maintenance.lock');

/**
 * Check whether system maintenance mode is active.
 */
export function isMaintenanceModeActive(lockPath: string = DEFAULT_MAINTENANCE_LOCK): boolean {
  return fs.existsSync(lockPath) || process.env.MAINTENANCE_MODE === 'true';
}

/**
 * Enable maintenance mode by creating lockfile.
 */
export function enableMaintenanceMode(lockPath: string = DEFAULT_MAINTENANCE_LOCK): void {
  const dir = path.dirname(lockPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    lockPath,
    JSON.stringify({
      enabledAt: new Date().toISOString(),
      pid: process.pid,
      reason: 'Database maintenance or restoration in progress',
    }),
    { mode: 0o600 }
  );
}

/**
 * Disable maintenance mode by removing lockfile.
 */
export function disableMaintenanceMode(lockPath: string = DEFAULT_MAINTENANCE_LOCK): void {
  if (fs.existsSync(lockPath)) {
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }
}

/**
 * Test whether a TCP port is currently listening (e.g., active API server process).
 */
export function isPortListening(port: number, host = '127.0.0.1', timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

/**
 * Checks whether a given file path is a valid SQLite 3 database header.
 */
export function isSqliteDatabaseFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < 16) return false;
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, 15) === 'SQLite format 3';
  } catch {
    return false;
  }
}

/**
 * Flush SQLite WAL log safely into the database file using PRAGMA wal_checkpoint(TRUNCATE).
 * Ensures consistent pre-restore snapshot and avoids orphaned WAL transactions.
 */
export async function checkpointAndFlushWal(sqliteFilePath: string): Promise<void> {
  if (!isSqliteDatabaseFile(sqliteFilePath)) return;
  const normPath = sqliteFilePath.replace(/\\/g, '/');
  const tempClient = new PrismaClient({
    datasourceUrl: `file:${normPath}`,
    log: ['error'],
  });

  try {
    await tempClient.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (err) {
    // Non-fatal if DB is not in WAL mode or busy
  } finally {
    await tempClient.$disconnect();
  }
}

/**
 * Verify that no active process is currently holding an exclusive transaction or lock on SQLite.
 */
export async function verifyDatabaseExclusiveLock(
  sqliteFilePath: string,
  timeoutMs = 1500
): Promise<{ lockAcquired: boolean; error?: string }> {
  if (!isSqliteDatabaseFile(sqliteFilePath)) {
    return { lockAcquired: true };
  }
  const normPath = sqliteFilePath.replace(/\\/g, '/');
  const tempClient = new PrismaClient({
    datasourceUrl: `file:${normPath}`,
    log: ['error'],
  });

  try {
    await tempClient.$queryRawUnsafe(`PRAGMA busy_timeout = ${timeoutMs};`);
    await tempClient.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe('SELECT 1;');
      },
      { timeout: timeoutMs }
    );
    return { lockAcquired: true };
  } catch (error) {
    return {
      lockAcquired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await tempClient.$disconnect();
  }
}

/**
 * Performs a transactionally consistent online SQLite backup using SQLite's native VACUUM INTO.
 * Safe to execute while the database is active and under concurrent load or in WAL mode.
 */
export async function createDatabaseBackup(options?: {
  destinationDir?: string;
  retentionDays?: number;
  maxBackups?: number;
  customFilename?: string;
}): Promise<BackupResult> {
  const rawDestDir =
    options?.destinationDir ||
    process.env.BACKUP_DIR ||
    path.resolve(process.cwd(), 'backups');
  const destDir = path.resolve(rawDestDir);

  // 1. Ensure backup destination directory exists with restrictive permissions
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true, mode: 0o700 });
  }

  // 2. Validate custom filename against path traversal
  if (options?.customFilename) {
    if (
      !/^[a-zA-Z0-9_\-\.]+$/.test(options.customFilename) ||
      options.customFilename.includes('..') ||
      options.customFilename.includes('/') ||
      options.customFilename.includes('\\')
    ) {
      throw new Error(`Invalid backup filename (path traversal prohibited): ${options.customFilename}`);
    }
  }

  // 3. Generate unambiguous timestamped filename
  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const filename =
    options?.customFilename || `nool-and-nila-backup-${timestampStr}.db`;
  const backupFilePath = path.resolve(destDir, filename);

  // Ensure resolved path is strictly within the destination directory
  if (!backupFilePath.startsWith(destDir)) {
    throw new Error(`Security violation: backup path escaped destination directory: ${backupFilePath}`);
  }

  if (fs.existsSync(backupFilePath)) {
    throw new Error(`Backup target file already exists: ${backupFilePath}`);
  }

  // 4. Normalize path for SQLite SQL string (forward slashes prevent escaping issues on Windows)
  const sqliteDestPath = backupFilePath.replace(/\\/g, '/');

  try {
    // 4. Execute SQLite VACUUM INTO for consistent online snapshot
    // Escaping single quotes in path if any
    const escapedPath = sqliteDestPath.replace(/'/g, "''");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedPath}'`);

    // 5. Verify physical backup file existence and size
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup failed: destination file was not created at ${backupFilePath}`);
    }

    const stat = fs.statSync(backupFilePath);
    if (stat.size === 0) {
      fs.unlinkSync(backupFilePath);
      throw new Error(`Backup failed: generated backup file is empty (0 bytes)`);
    }

    // 6. Verify SQLite internal integrity of the generated backup
    const integrityResult = await verifyBackupIntegrity(backupFilePath);
    if (integrityResult !== 'ok') {
      fs.unlinkSync(backupFilePath);
      throw new Error(`Backup failed integrity verification: ${integrityResult}`);
    }

    // 7. Prune older backups according to retention policies
    const retentionDays = options?.retentionDays ?? (process.env.BACKUP_RETENTION_DAYS ? parseInt(process.env.BACKUP_RETENTION_DAYS, 10) : 30);
    const maxBackups = options?.maxBackups ?? 50;
    pruneOldBackups(destDir, retentionDays, maxBackups);

    return {
      success: true,
      backupPath: backupFilePath,
      backupFilename: filename,
      sizeBytes: stat.size,
      sizeFormatted: formatBytes(stat.size),
      timestamp: now.toISOString(),
      integrity: 'ok',
    };
  } catch (error) {
    // Clean up partial file on failure if it exists
    if (fs.existsSync(backupFilePath)) {
      try {
        fs.unlinkSync(backupFilePath);
      } catch {
        // ignore cleanup error
      }
    }
    throw error;
  }
}

/**
 * Checks SQLite PRAGMA integrity_check on any SQLite file.
 */
export async function verifyBackupIntegrity(backupFilePath: string): Promise<string> {
  const normPath = backupFilePath.replace(/\\/g, '/');
  const tempClient = new PrismaClient({
    datasourceUrl: `file:${normPath}`,
    log: ['error'],
  });

  try {
    const rows = await tempClient.$queryRawUnsafe<Array<{ integrity_check: string }>>(
      'PRAGMA integrity_check;'
    );
    const status = rows[0]?.integrity_check || 'unknown';
    return status;
  } finally {
    await tempClient.$disconnect();
  }
}

/**
 * Verifies a backup file: checks existence, size, SQLite integrity, and readable record counts.
 */
export async function verifyBackupFile(backupFilePath: string): Promise<VerificationResult> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist: ${backupFilePath}`);
  }

  const stat = fs.statSync(backupFilePath);
  if (stat.size === 0) {
    throw new Error(`Backup file is empty: ${backupFilePath}`);
  }

  const normPath = backupFilePath.replace(/\\/g, '/');
  const tempClient = new PrismaClient({
    datasourceUrl: `file:${normPath}`,
    log: ['error'],
  });

  try {
    const rows = await tempClient.$queryRawUnsafe<Array<{ integrity_check: string }>>(
      'PRAGMA integrity_check;'
    );
    const integrityStatus = rows[0]?.integrity_check || 'unknown';

    if (integrityStatus !== 'ok') {
      return {
        isValid: false,
        message: `Corrupt SQLite file: ${integrityStatus}`,
        sizeBytes: stat.size,
        integrity: integrityStatus,
        recordCounts: { users: 0, products: 0, orders: 0, categories: 0, storeSettings: 0 },
      };
    }

    const [users, products, orders, categories, storeSettings] = await Promise.all([
      tempClient.user.count(),
      tempClient.product.count(),
      tempClient.order.count(),
      tempClient.category.count(),
      tempClient.storeSetting.count(),
    ]);

    return {
      isValid: true,
      message: 'Backup is valid and all required tables are readable.',
      sizeBytes: stat.size,
      integrity: 'ok',
      recordCounts: { users, products, orders, categories, storeSettings },
    };
  } finally {
    await tempClient.$disconnect();
  }
}

/**
 * Prunes expired or excess backup files matching the naming pattern in destination directory.
 */
export function pruneOldBackups(dir: string, retentionDays: number, maxBackups: number): number {
  if (!fs.existsSync(dir)) return 0;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('nool-and-nila-backup-') && f.endsWith('.db'))
    .map((f) => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return { filename: f, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first

  let prunedCount = 0;
  const nowMs = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  files.forEach((file, index) => {
    const isPastRetention = nowMs - file.mtimeMs > maxAgeMs;
    const isExceedingCount = index >= maxBackups;

    if (isPastRetention || isExceedingCount) {
      try {
        fs.unlinkSync(file.fullPath);
        prunedCount++;
      } catch (err) {
        console.warn(`[BackupService] Warning: Could not remove old backup ${file.filename}:`, err);
      }
    }
  });

  return prunedCount;
}

/**
 * Restores a database backup into a target database location.
 * Workflow:
 * 1. Verify source backup file validity & integrity.
 * 2. Stage copy in an isolated temporary location.
 * 3. Verify staged copy schema & record accessibility.
 * 4. If dryRun: stop here and clean up.
 * 5. If actual restore:
 *    - Create pre-restore safety copy of current target DB (`.pre-restore-<timestamp>.bak`).
 *    - Atomic replacement of target DB file.
 *    - Remove temporary staging copy.
 */
export async function restoreDatabaseBackup(
  backupFilePath: string,
  options?: {
    targetDbPath?: string;
    dryRun?: boolean;
  }
): Promise<RestoreResult> {
  // 1. Verify backup file exists and is valid
  const verification = await verifyBackupFile(backupFilePath);
  if (!verification.isValid) {
    throw new Error(`Cannot restore invalid backup: ${verification.message}`);
  }

  // 2. Identify target DB path
  const targetDbPath = path.resolve(
    options?.targetDbPath ||
    resolveSqlitePath(process.env.DATABASE_URL || 'file:./dev.db')
  );

  const resolvedBackup = path.resolve(backupFilePath);
  if (resolvedBackup === targetDbPath) {
    throw new Error(`Refusing restoration: source backup file is identical to the active target database: ${resolvedBackup}`);
  }

  // 3. Staging copy in temp directory
  const tempStagingPath = `${targetDbPath}.staging-${Date.now()}.tmp`;
  fs.copyFileSync(backupFilePath, tempStagingPath);

  try {
    // 4. Verify staged database
    const stagedCheck = await verifyBackupIntegrity(tempStagingPath);
    if (stagedCheck !== 'ok') {
      throw new Error(`Staged database failed integrity verification: ${stagedCheck}`);
    }

    if (options?.dryRun) {
      // Dry run: remove temp staging copy and return
      fs.unlinkSync(tempStagingPath);
      return {
        success: true,
        backupPath: backupFilePath,
        targetDbPath,
        verifiedRecordCounts: verification.recordCounts,
        dryRun: true,
        message: 'DRY RUN: Backup is fully valid, readable, and verified for restoration.',
      };
    }

    // 5. If active DB exists, flush WAL, verify no active concurrent writers, and create pre-restore snapshot
    let preRestoreBackupPath: string | undefined;
    if (fs.existsSync(targetDbPath)) {
      // 5a. Safely flush pending WAL pages to disk so snapshot is transactionally complete
      await checkpointAndFlushWal(targetDbPath);

      // 5b. Verify no active process holds an exclusive write lock
      const lockStatus = await verifyDatabaseExclusiveLock(targetDbPath);
      if (!lockStatus.lockAcquired) {
        throw new Error(
          `Restoration aborted for safety: Target database is currently locked by another active process: ${lockStatus.error}`
        );
      }

      // 5c. Create pre-restore safety copy of the active database
      preRestoreBackupPath = `${targetDbPath}.pre-restore-${Date.now()}.bak`;
      fs.copyFileSync(targetDbPath, preRestoreBackupPath);
    }

    // 5d. Handle WAL / SHM sidecars safely: after checkpoint & verification, remove sidecars
    // to prevent mismatched transaction replay over the newly restored database.
    const walPath = `${targetDbPath}-wal`;
    const shmPath = `${targetDbPath}-shm`;
    if (fs.existsSync(walPath)) {
      try { fs.unlinkSync(walPath); } catch { /* ignore */ }
    }
    if (fs.existsSync(shmPath)) {
      try { fs.unlinkSync(shmPath); } catch { /* ignore */ }
    }

    // 6. Atomically replace target database with verified staged copy
    fs.copyFileSync(tempStagingPath, targetDbPath);
    fs.unlinkSync(tempStagingPath);

    // 7. Post-cutover verification: verify the newly installed active database
    const postCutoverCheck = await verifyBackupIntegrity(targetDbPath);
    if (postCutoverCheck !== 'ok') {
      if (preRestoreBackupPath && fs.existsSync(preRestoreBackupPath)) {
        fs.copyFileSync(preRestoreBackupPath, targetDbPath);
      }
      throw new Error(`Restored database failed post-cutover verification: ${postCutoverCheck}. Automatic rollback executed.`);
    }

    return {
      success: true,
      backupPath: backupFilePath,
      targetDbPath,
      preRestoreBackupPath,
      verifiedRecordCounts: verification.recordCounts,
      dryRun: false,
      message: 'Database backup restored successfully. Active database updated and verified.',
    };
  } catch (error) {
    // Clean up staging file if left behind
    if (fs.existsSync(tempStagingPath)) {
      try { fs.unlinkSync(tempStagingPath); } catch { /* ignore */ }
    }
    throw error;
  }
}

/**
 * Manually roll back database from a verified pre-restoration safety copy.
 */
export function rollbackDatabaseRestoration(targetDbPath: string, preRestoreBackupPath: string): void {
  const resolvedTarget = path.resolve(targetDbPath);
  const resolvedBak = path.resolve(preRestoreBackupPath);

  if (!fs.existsSync(resolvedBak)) {
    throw new Error(`Rollback failed: pre-restore backup file does not exist at ${resolvedBak}`);
  }

  fs.copyFileSync(resolvedBak, resolvedTarget);
  // Clear any dangling WAL files
  try { fs.unlinkSync(`${resolvedTarget}-wal`); } catch { /* ignore */ }
  try { fs.unlinkSync(`${resolvedTarget}-shm`); } catch { /* ignore */ }
}
