import { createClient } from '@supabase/supabase-js';

const configured = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const storageConfigured = configured;
export const BUCKET = process.env.SUPABASE_BUCKET || 'mahawar-sabha';

export const supabase = configured
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  : null;

export function requireStorage(_req, res, next) {
  if (!storageConfigured) {
    return res.status(503).json({
      code: 'STORAGE_NOT_CONFIGURED',
      message:
        'Supabase Storage credentials have not been configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable uploads.',
    });
  }
  next();
}
