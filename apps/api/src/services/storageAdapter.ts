import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface OffHostBackupMetadata {
  filename: string;
  sha256: string;
  sizeBytes: number;
  uploadedAt: string;
  remoteLocation: string;
  provider: string;
}

export interface BackupStorageAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  uploadBackup(localFilePath: string, remoteFilename?: string): Promise<OffHostBackupMetadata>;
  downloadBackup(remoteFilename: string, destinationLocalPath: string): Promise<{
    localPath: string;
    sha256Verified: boolean;
    sizeBytes: number;
  }>;
  listBackups(): Promise<OffHostBackupMetadata[]>;
  pruneBackups(retentionDays: number, minKeep?: number): Promise<number>;
}

/**
 * Calculates SHA-256 hash of a local file.
 */
export function calculateFileSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Isolated secondary storage adapter (e.g. Dedicated DR volume, NFS mount, or separate secondary disk).
 * Used when dedicated cloud bucket credentials are not yet supplied or in on-premise/hybrid staging.
 */
export class SecondaryVolumeStorageAdapter implements BackupStorageAdapter {
  readonly providerName = 'SecondaryVolume';
  private storageDir: string;

  constructor(storageDir?: string) {
    this.storageDir = path.resolve(
      storageDir || process.env.OFF_HOST_BACKUP_DIR || ''
    );
  }

  isConfigured(): boolean {
    return Boolean(this.storageDir && this.storageDir.length > 0);
  }

  getStorageDirectory(): string {
    return this.storageDir;
  }

  private validateFilename(filename: string): void {
    if (
      !/^[a-zA-Z0-9_\-\.]+$/.test(filename) ||
      filename.includes('..') ||
      filename.includes('/') ||
      filename.includes('\\')
    ) {
      throw new Error(`Security violation: Invalid off-host backup filename (path traversal prohibited): ${filename}`);
    }
  }

  async uploadBackup(localFilePath: string, remoteFilename?: string): Promise<OffHostBackupMetadata> {
    if (!this.isConfigured()) {
      throw new Error('Secondary storage adapter is not configured. Set OFF_HOST_BACKUP_DIR.');
    }

    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Local backup file not found for off-host replication: ${localFilePath}`);
    }

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true, mode: 0o700 });
    }

    const filename = remoteFilename || path.basename(localFilePath);
    this.validateFilename(filename);

    const destPath = path.resolve(this.storageDir, filename);
    if (!destPath.startsWith(this.storageDir)) {
      throw new Error(`Security violation: Target destination escaped configured storage directory: ${destPath}`);
    }

    // 1. Calculate local checksum
    const sha256 = calculateFileSha256(localFilePath);
    const stat = fs.statSync(localFilePath);

    // 2. Perform copy to off-host volume
    fs.copyFileSync(localFilePath, destPath);

    // 3. Verify destination checksum
    const destSha256 = calculateFileSha256(destPath);
    if (sha256 !== destSha256) {
      fs.unlinkSync(destPath);
      throw new Error(`Off-host backup transmission checksum mismatch: expected ${sha256}, got ${destSha256}`);
    }

    // 4. Save metadata sidecar
    const metadata: OffHostBackupMetadata = {
      filename,
      sha256,
      sizeBytes: stat.size,
      uploadedAt: new Date().toISOString(),
      remoteLocation: destPath,
      provider: this.providerName,
    };

    const metaPath = `${destPath}.meta.json`;
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    return metadata;
  }

  async downloadBackup(
    remoteFilename: string,
    destinationLocalPath: string
  ): Promise<{ localPath: string; sha256Verified: boolean; sizeBytes: number }> {
    if (!this.isConfigured()) {
      throw new Error('Secondary storage adapter is not configured.');
    }

    this.validateFilename(remoteFilename);
    const sourcePath = path.resolve(this.storageDir, remoteFilename);
    const metaPath = `${sourcePath}.meta.json`;

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Remote backup not found in secondary storage: ${sourcePath}`);
    }

    let expectedSha256: string | undefined;
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as OffHostBackupMetadata;
        expectedSha256 = meta.sha256;
      } catch {
        // Fall back to direct hash
      }
    }

    const destDir = path.dirname(destinationLocalPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy from off-host volume to target local restoration path
    fs.copyFileSync(sourcePath, destinationLocalPath);

    const downloadedSha256 = calculateFileSha256(destinationLocalPath);
    if (expectedSha256 && downloadedSha256 !== expectedSha256) {
      try { fs.unlinkSync(destinationLocalPath); } catch { /* ignore */ }
      throw new Error(`Downloaded backup failed integrity verification: hash mismatch (${downloadedSha256} vs ${expectedSha256})`);
    }

    const stat = fs.statSync(destinationLocalPath);
    return {
      localPath: destinationLocalPath,
      sha256Verified: Boolean(expectedSha256),
      sizeBytes: stat.size,
    };
  }

  async listBackups(): Promise<OffHostBackupMetadata[]> {
    if (!this.isConfigured() || !fs.existsSync(this.storageDir)) {
      return [];
    }

    const files = fs.readdirSync(this.storageDir).filter((f) => f.endsWith('.meta.json'));
    const metadataList: OffHostBackupMetadata[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(this.storageDir, f);
        const content = fs.readFileSync(fullPath, 'utf8');
        metadataList.push(JSON.parse(content));
      } catch {
        // ignore unreadable metadata
      }
    }

    return metadataList.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async pruneBackups(retentionDays: number, minKeep = 2): Promise<number> {
    if (!this.isConfigured() || !fs.existsSync(this.storageDir)) {
      return 0;
    }

    const backups = await this.listBackups();
    if (backups.length <= minKeep) {
      return 0; // Safeguard: Never prune if at or below minimum retention threshold
    }

    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    // Keep the most recent `minKeep` regardless of age
    const eligibleForPruning = backups.slice(minKeep);

    for (const item of eligibleForPruning) {
      const uploadTime = new Date(item.uploadedAt).getTime();
      if (uploadTime < cutoffMs) {
        const dataPath = path.resolve(this.storageDir, item.filename);
        const metaPath = `${dataPath}.meta.json`;
        try {
          if (fs.existsSync(dataPath)) fs.unlinkSync(dataPath);
          if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
          pruned++;
        } catch (err) {
          console.warn(`[OffHostStorage] Failed to prune backup ${item.filename}:`, err);
        }
      }
    }

    return pruned;
  }
}

/**
 * Cloud S3-Compatible Object Storage Adapter (AWS S3, Cloudflare R2, MinIO, Wasabi).
 */
export class S3CompatibleStorageAdapter implements BackupStorageAdapter {
  readonly providerName = 'S3CompatibleStorage';
  private bucket: string;
  private endpoint?: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = process.env.BACKUP_S3_BUCKET || '';
    this.endpoint = process.env.BACKUP_S3_ENDPOINT || '';
    this.region = process.env.BACKUP_S3_REGION || 'ap-south-1';
    this.accessKeyId = process.env.BACKUP_S3_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.BACKUP_S3_SECRET_ACCESS_KEY || '';
  }

  isConfigured(): boolean {
    return Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  async uploadBackup(_localFilePath: string, _remoteFilename?: string): Promise<OffHostBackupMetadata> {
    if (!this.isConfigured()) {
      throw new Error(
        'S3 storage adapter is NOT CONFIGURED. Set BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, and BACKUP_S3_SECRET_ACCESS_KEY.'
      );
    }
    throw new Error('S3 upload requires cloud credentials and active network access.');
  }

  async downloadBackup(
    _remoteFilename: string,
    _destinationLocalPath: string
  ): Promise<{ localPath: string; sha256Verified: boolean; sizeBytes: number }> {
    if (!this.isConfigured()) {
      throw new Error('S3 storage adapter is NOT CONFIGURED.');
    }
    throw new Error('S3 download requires cloud credentials and active network access.');
  }

  async listBackups(): Promise<OffHostBackupMetadata[]> {
    if (!this.isConfigured()) return [];
    return [];
  }

  async pruneBackups(_retentionDays: number, _minKeep?: number): Promise<number> {
    return 0;
  }
}

/**
 * Fallback Null adapter when no remote or secondary destination is configured.
 */
export class NullStorageAdapter implements BackupStorageAdapter {
  readonly providerName = 'None';
  isConfigured(): boolean {
    return false;
  }
  async uploadBackup(): Promise<OffHostBackupMetadata> {
    throw new Error('No off-host backup destination is configured on this host.');
  }
  async downloadBackup(): Promise<{ localPath: string; sha256Verified: boolean; sizeBytes: number }> {
    throw new Error('No off-host backup destination is configured on this host.');
  }
  async listBackups(): Promise<OffHostBackupMetadata[]> {
    return [];
  }
  async pruneBackups(): Promise<number> {
    return 0;
  }
}

/**
 * Factory to retrieve the configured backup storage adapter.
 */
export function getBackupStorageAdapter(customDir?: string): BackupStorageAdapter {
  if (customDir) {
    return new SecondaryVolumeStorageAdapter(customDir);
  }

  const s3Adapter = new S3CompatibleStorageAdapter();
  if (s3Adapter.isConfigured()) {
    return s3Adapter;
  }

  const volumeDir = process.env.OFF_HOST_BACKUP_DIR;
  if (volumeDir && volumeDir.trim().length > 0) {
    return new SecondaryVolumeStorageAdapter(volumeDir);
  }

  return new NullStorageAdapter();
}
