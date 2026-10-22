import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasourceUrl: config.databaseUrl,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Cache PrismaClient on globalThis to prevent connection exhaustion in serverless environments
globalThis.prismaGlobal = prisma;

/**
 * Configure SQLite runtime pragmas for reliability:
 * 1. busy_timeout = 5000 (waits up to 5s for lock rather than failing immediately)
 * 2. journal_mode = WAL (enables concurrent readers with active writer)
 */
export async function configureSqlitePragmas(client: PrismaClient = prisma): Promise<void> {
  // Only configure SQLite pragmas if using a SQLite database file
  if (!config.databaseUrl.startsWith('file:') && !config.databaseUrl.includes('.db')) {
    return;
  }
  try {
    await client.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
    await client.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
  } catch (err) {
    if (config.nodeEnv === 'development') {
      console.warn('[Prisma] Note: SQLite pragma configuration skipped:', err);
    }
  }
}
