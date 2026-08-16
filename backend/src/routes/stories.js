import { Router } from 'express';
import Story from '../models/Story.js';
import FileAsset from '../models/FileAsset.js';
import { supabase, storageConfigured } from '../config/storage.js';

const router = Router();

function scrub(doc) {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return rest;
}

// GET /api/stories?location=mathura&tag=history&limit=20 — published only
router.get('/', async (req, res, next) => {
  try {
    const location = String(req.query.location || 'mathura').toLowerCase();
    if (!['mathura', 'rewari'].includes(location)) {
      return res.status(400).json({ code: 'INVALID_LOCATION' });
    }
    const query = { location, published: true, is_deleted: false };
    if (req.query.tag) query.tags = String(req.query.tag);
    const limit = Math.min(Number(req.query.limit || 50), 100);
    const stories = await Story.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      stories: stories.map(scrub).map((s) => {
        const { body, ...rest } = s;
        return rest;
      }),
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/stories/:slug — public detail
router.get('/:slug', async (req, res, next) => {
  try {
    const story = await Story.findOne({
      slug: req.params.slug,
      published: true,
      is_deleted: false,
    }).lean();
    if (!story) return res.status(404).json({ code: 'NOT_FOUND' });
    res.json({ story: scrub(story) });
  } catch (e) {
    next(e);
  }
});

// GET /api/stories/:slug/cover — public cover stream (only for published stories)
router.get('/:slug/cover', async (req, res, next) => {
  try {
    const story = await Story.findOne({
      slug: req.params.slug,
      published: true,
      is_deleted: false,
    }).lean();
    if (!story || !story.coverAssetId) return res.sendStatus(404);
    if (!storageConfigured) return res.sendStatus(404);

    const asset = await FileAsset.findOne({ id: story.coverAssetId, is_deleted: false }).lean();
    if (!asset) return res.sendStatus(404);

    const { data, error } = await supabase.storage.from(asset.bucket).download(asset.storagePath);
    if (error || !data) return res.sendStatus(404);

    const buffer = Buffer.from(await data.arrayBuffer());
    res.set({
      'Content-Type': asset.contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=3600',
    });
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

export default router;
