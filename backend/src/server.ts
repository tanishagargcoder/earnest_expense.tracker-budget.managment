import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { pool } from './db/pool.js';

async function main() {
  await runMigrations();
  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => void pool.end().then(() => process.exit(0)));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
