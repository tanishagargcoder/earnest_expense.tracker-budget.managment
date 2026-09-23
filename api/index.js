// Vercel serverless entry point: serves the Express API under /api/* on the
// same domain as the React app. The backend is compiled to backend/dist by
// the build command in vercel.json before this function is bundled.
import { createApp } from '../backend/dist/app.js';
import { runMigrations } from '../backend/dist/db/migrate.js';

const app = createApp();
let ready;

export default async function handler(req, res) {
  // Apply pending migrations once per cold start (safe to run concurrently).
  ready ??= runMigrations(() => undefined).catch((error) => {
    ready = undefined;
    throw error;
  });
  try {
    await ready;
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Database is not available' } });
    return;
  }
  return app(req, res);
}
