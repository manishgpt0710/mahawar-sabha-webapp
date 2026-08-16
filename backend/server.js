import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import locationRoutes from './src/routes/locations.js';
import mediaRoutes from './src/routes/media.js';

const PORT = Number(process.env.PORT || 8001);
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'test_database';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());

if (!MONGO_URL) {
  console.error('[fatal] MONGO_URL is not set');
  process.exit(1);
}

async function start() {
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
  console.log(`[db] connected to ${DB_NAME}`);

  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: false, // allow images to be embedded in the SPA
    }),
  );
  app.use(
    cors({
      origin: CORS_ORIGINS.includes('*') ? true : CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));

  // Root
  app.get('/api/', (_req, res) => {
    res.json({ message: 'Mahawar Sabha API', version: 'phase-1', runtime: 'node' });
  });

  // Feature routers
  app.use('/api/locations', locationRoutes);
  app.use('/api/admin/media', mediaRoutes);

  // 404 for unknown /api routes
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Multer + generic error handler
  app.use((err, _req, res, _next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ code: 'FILE_TOO_LARGE', message: 'File exceeds size limit.' });
    }
    console.error('[error]', err);
    const status = err.status || 500;
    res.status(status).json({
      code: err.code || 'INTERNAL_ERROR',
      message: status === 500 ? 'Internal server error' : err.message || 'Error',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[api] Mahawar Sabha API listening on 0.0.0.0:${PORT}`);
  });
}

start().catch((e) => {
  console.error('[startup-failed]', e);
  process.exit(1);
});
