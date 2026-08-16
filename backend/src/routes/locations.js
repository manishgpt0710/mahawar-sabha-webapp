import { Router } from 'express';

const router = Router();

const LOCATION_CONTENT = {
  mathura: {
    slug: 'mathura',
    city: 'Mathura',
    name: 'Mathura Sabha',
    tagline: 'जहाँ संस्कार मिलते हैं, समाज बनता है',
    status: 'launch-ready',
    pages: ['home', 'about'],
  },
  rewari: {
    slug: 'rewari',
    city: 'Rewari',
    name: 'Rewari Sabha',
    tagline: 'अपनापन, सेवा और साथ',
    status: 'placeholder',
    pages: ['home', 'about'],
  },
};

router.get('/', (_req, res) => {
  res.json({ locations: Object.values(LOCATION_CONTENT) });
});

router.get('/:slug', (req, res) => {
  const location = LOCATION_CONTENT[String(req.params.slug || '').toLowerCase()];
  if (!location) {
    return res.status(404).json({
      error: 'Location not found',
      available: Object.keys(LOCATION_CONTENT),
    });
  }
  res.json(location);
});

export default router;
