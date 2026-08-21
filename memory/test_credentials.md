# Mahawar Sabha — Admin Test Credentials

## Admin Media Library & Journal

- Route: `/admin` (media library) and `/admin/stories` (heritage journal)
- Auth: Bearer token from `ADMIN_TOKEN` in `/app/backend/.env`
- **Token**: `mahawar-admin-dev-token`

## Supabase Storage (LIVE)

- `SUPABASE_URL` = `https://ihscernzfjezgioguwok.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
- Bucket: `mahawar-sabha` (Private)
- Uploads, listing, backend-streamed downloads, and soft-delete verified end-to-end.
- Public story covers stream via `GET /api/stories/:slug/cover` when `coverAssetId` is set.

## Backend runtime

- Backend is **Node.js Express** (`/app/backend/server.js`) on port 8001.
- MongoDB via `MONGO_URL` + `DB_NAME`.
