/**
 * Simple bearer-token admin guard.
 * Uses ADMIN_TOKEN from environment. Rejects with 401 if missing/invalid.
 * NOTE: This is a lightweight guard for Phase 1 admin skeleton.
 *       Replace with real auth (JWT/session) before production launch.
 */
export function adminOnly(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({
      code: 'ADMIN_TOKEN_NOT_CONFIGURED',
      message: 'ADMIN_TOKEN is not set on the server.',
    });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
  if (!token || token !== expected) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Admin authentication required.' });
  }
  req.user = { id: 'admin', role: 'admin' };
  next();
}
