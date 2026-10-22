import fs from 'fs';
import path from 'path';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { prisma, configureSqlitePragmas } from './config/prisma.js';

async function startServer() {
  // Configure SQLite WAL mode & busy timeout for concurrent query reliability
  await configureSqlitePragmas();

  const app = createApp();

  const host = '0.0.0.0';
  const server = app.listen(config.port, host, () => {
    console.log(`✨ Nool & Nila API server running on http://${host}:${config.port} in ${config.nodeEnv} mode`);
    console.log(`📡 Health endpoint: http://${host}:${config.port}/api/v1/health`);
  });

  const pidFile = path.resolve(process.cwd(), '.api.pid');
  try {
    fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  } catch {
    // Ignore PID file write errors if non-fatal
  }

  const cleanupAndExit = async (signal: string) => {
    console.log(`\n${signal} received. Closing HTTP server gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        if (fs.existsSync(pidFile)) {
          fs.unlinkSync(pidFile);
        }
      } catch {
        // ignore
      }
      try {
        await prisma.$disconnect();
        console.log('Prisma connections disconnected.');
      } catch {
        // ignore
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));
  process.on('SIGINT', () => cleanupAndExit('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
