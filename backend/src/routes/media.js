import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import FileAsset from '../models/FileAsset.js';
import { supabase, BUCKET, requireStorage, storageConfigured } from '../config/storage.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = Router();

const MAX_IMAGE = Number(process.env.MAX_IMAGE_SIZE_BYTES || 10 * 1024 * 1024); // 10 MB
const MAX_DOC = Number(process.env.MAX_DOC_SIZE_BYTES || 15 * 1024 * 1024); // 15 MB

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const EXT_BY_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// Use disk-agnostic memory storage; limits enforced at route level.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(MAX_IMAGE, MAX_DOC), files: 1, fields: 10, parts: 20 },
});

function validScope(location, category) {
  return ['mathura', 'rewari'].includes(location) && ['gallery', 'documents'].includes(category);
}

function safeExtension(originalName, contentType) {
  const ext = path.extname(originalName || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
  return EXT_BY_TYPE[contentType] || ext || '.bin';
}

// Public health/status endpoint (no auth) for the admin UI to show a helpful banner
router.get('/status', (_req, res) => {
  res.json({
    configured: storageConfigured,
    bucket: storageConfigured ? BUCKET : null,
    limits: { imageMaxBytes: MAX_IMAGE, documentMaxBytes: MAX_DOC },
  });
});

// POST /api/admin/media/upload
router.post(
  '/upload',
  adminOnly,
  requireStorage,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const location = String(req.body.location || '').toLowerCase();
      const category = String(req.body.category || '').toLowerCase();
      if (!validScope(location, category)) {
        return res.status(400).json({ code: 'INVALID_SCOPE', message: 'Invalid location or category.' });
      }
      if (!req.file) {
        return res.status(400).json({ code: 'FILE_REQUIRED', message: 'A file field is required.' });
      }

      const isImage = IMAGE_TYPES.has(req.file.mimetype);
      const isDoc = DOC_TYPES.has(req.file.mimetype);

      if (category === 'gallery' && !isImage) {
        return res.status(415).json({
          code: 'UNSUPPORTED_TYPE',
          message: 'Gallery accepts jpg, png, webp, gif only.',
        });
      }
      if (category === 'documents' && !isDoc) {
        return res.status(415).json({
          code: 'UNSUPPORTED_TYPE',
          message: 'Documents accepts pdf, doc, docx only.',
        });
      }

      const maxSize = isImage ? MAX_IMAGE : MAX_DOC;
      if (req.file.size > maxSize) {
        return res.status(413).json({
          code: 'FILE_TOO_LARGE',
          message: `File exceeds allowed size (${Math.round(maxSize / (1024 * 1024))} MB).`,
        });
      }

      const filename = `${randomUUID()}${safeExtension(req.file.originalname, req.file.mimetype)}`;
      const storagePath = `${location}/${category}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, req.file.buffer, {
          contentType: req.file.mimetype,
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) {
        return res.status(502).json({ code: 'STORAGE_UPLOAD_FAILED', message: uploadError.message });
      }

      try {
        const doc = await FileAsset.create({
          location,
          category,
          bucket: BUCKET,
          storagePath,
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          uploadedBy: String(req.user?.id || 'admin'),
        });
        return res.status(201).json({ file: doc.toJSON() });
      } catch (dbErr) {
        // Compensating cleanup — don't leave an orphan Storage object
        try {
          await supabase.storage.from(BUCKET).remove([storagePath]);
        } catch (_) {
          /* ignore */
        }
        throw dbErr;
      }
    } catch (e) {
      next(e);
    }
  },
);

// GET /api/admin/media?location=mathura&category=gallery
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const location = String(req.query.location || '').toLowerCase();
    const category = String(req.query.category || '').toLowerCase();
    if (!validScope(location, category)) {
      return res.status(400).json({ code: 'INVALID_SCOPE', message: 'Invalid location or category.' });
    }
    const files = await FileAsset.find({ location, category, is_deleted: false })
      .sort({ createdAt: -1 })
      .lean();
    // Strip _id and __v defensively
    const cleaned = files.map(({ _id, __v, ...rest }) => rest);
    res.json({ files: cleaned, configured: storageConfigured });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/media/:id/download — backend-mediated stream (auth via query token for anchor links)
router.get('/:id/download', async (req, res, next) => {
  try {
    // Accept token via header OR query param (browser <a href> can't set headers).
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin token required.' });
    }
    if (!storageConfigured) {
      return res.status(503).json({ code: 'STORAGE_NOT_CONFIGURED' });
    }

    const file = await FileAsset.findOne({ id: req.params.id, is_deleted: false }).lean();
    if (!file) return res.sendStatus(404);

    const { data, error } = await supabase.storage.from(file.bucket).download(file.storagePath);
    if (error || !data) return res.sendStatus(404);

    const buffer = Buffer.from(await data.arrayBuffer());
    const inline = req.query.inline === '1';
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': String(buffer.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(
        file.originalName,
      )}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/admin/media/:id — soft delete + storage remove
router.delete('/:id', adminOnly, requireStorage, async (req, res, next) => {
  try {
    const file = await FileAsset.findOneAndUpdate(
      { id: req.params.id, is_deleted: false },
      { $set: { is_deleted: true, deletedAt: new Date() } },
      { new: true },
    );
    if (!file) return res.sendStatus(404);

    const { error } = await supabase.storage.from(file.bucket).remove([file.storagePath]);
    if (error) {
      return res.status(502).json({ code: 'STORAGE_DELETE_FAILED', message: error.message });
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
