import { Router } from 'express';
import Story from '../models/Story.js';
import { adminOnly } from '../middleware/adminOnly.js';

const router = Router();

function slugify(input) {
  return (
    String(input || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'story'
  );
}

function makeExcerpt(body, len = 180) {
  const plain = String(body || '').replace(/\s+/g, ' ').trim();
  if (plain.length <= len) return plain;
  return `${plain.slice(0, len).trimEnd()}…`;
}

async function uniqueSlug(base, excludeId) {
  let slug = base;
  let n = 1;
  while (n < 50) {
    const clash = await Story.findOne({ slug, id: { $ne: excludeId || null } }).lean();
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now()}`;
}

function scrub(doc) {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return rest;
}

// All routes below require the admin token
router.use(adminOnly);

// GET /api/admin/stories?location=mathura — includes drafts
router.get('/', async (req, res, next) => {
  try {
    const location = String(req.query.location || 'mathura').toLowerCase();
    if (!['mathura', 'rewari'].includes(location)) {
      return res.status(400).json({ code: 'INVALID_LOCATION' });
    }
    const stories = await Story.find({ location, is_deleted: false })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ stories: stories.map(scrub) });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/stories/:id — includes drafts + full body
router.get('/:id', async (req, res, next) => {
  try {
    const story = await Story.findOne({ id: req.params.id, is_deleted: false }).lean();
    if (!story) return res.sendStatus(404);
    res.json({ story: scrub(story) });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/stories
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      subtitle = '',
      body,
      author = 'Mahawar Sabha',
      tags = [],
      coverUrl = '',
      coverAssetId = '',
      location = 'mathura',
      published = false,
    } = req.body || {};

    if (!title || !body) {
      return res
        .status(400)
        .json({ code: 'MISSING_FIELDS', message: 'title and body are required.' });
    }
    if (!['mathura', 'rewari'].includes(location)) {
      return res.status(400).json({ code: 'INVALID_LOCATION' });
    }

    const slug = await uniqueSlug(slugify(title));
    const story = await Story.create({
      title: String(title).trim(),
      subtitle: String(subtitle),
      body: String(body),
      excerpt: makeExcerpt(body),
      author: String(author),
      tags: Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
        : [],
      coverUrl: String(coverUrl),
      coverAssetId: String(coverAssetId),
      location,
      slug,
      published: Boolean(published),
      publishedAt: published ? new Date() : undefined,
    });
    res.status(201).json({ story: scrub(story.toJSON()) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/admin/stories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await Story.findOne({ id: req.params.id, is_deleted: false });
    if (!existing) return res.sendStatus(404);

    const { title, subtitle, body, author, tags, coverUrl, coverAssetId, published } =
      req.body || {};

    if (title !== undefined) {
      const nextTitle = String(title).trim();
      if (slugify(nextTitle) !== existing.slug) {
        existing.slug = await uniqueSlug(slugify(nextTitle), existing.id);
      }
      existing.title = nextTitle;
    }
    if (subtitle !== undefined) existing.subtitle = String(subtitle);
    if (body !== undefined) {
      existing.body = String(body);
      existing.excerpt = makeExcerpt(body);
    }
    if (author !== undefined) existing.author = String(author);
    if (tags !== undefined) {
      existing.tags = Array.isArray(tags)
        ? tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
        : [];
    }
    if (coverUrl !== undefined) existing.coverUrl = String(coverUrl);
    if (coverAssetId !== undefined) existing.coverAssetId = String(coverAssetId);
    if (published !== undefined) {
      const nowPublished = Boolean(published);
      if (nowPublished && !existing.published) existing.publishedAt = new Date();
      existing.published = nowPublished;
    }

    await existing.save();
    res.json({ story: scrub(existing.toJSON()) });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/admin/stories/:id — soft delete + unpublish
router.delete('/:id', async (req, res, next) => {
  try {
    const updated = await Story.findOneAndUpdate(
      { id: req.params.id, is_deleted: false },
      { $set: { is_deleted: true, published: false } },
      { new: true },
    );
    if (!updated) return res.sendStatus(404);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
