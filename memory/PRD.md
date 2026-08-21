# Mahawar Sabha Website — PRD

## Original Problem Statement
Location-aware community website for Mahawar Sabha with multi-location support (Mathura, Rewari), config-driven branding/content, responsive base layout, i18n (Hindi/English), auth/admin skeleton, and Phase 1 skeleton with Mathura home/about.

## User personas
- **Public visitor** — community member browsing Sabha content in Hindi/English.
- **Community admin** — uploads/curates gallery images and community documents per location.
- **Future member** — will register, view directory, events, donations (Phase 2).

## Architecture (current)
- **Frontend**: React 19 (CRA + CRACO), React Router, lucide-react icons, tailwind available.
- **Backend**: Node.js Express + Mongoose (ES modules) on port 8001. `/api/*` prefix.
- **Database**: MongoDB via `MONGO_URL` / `DB_NAME`.
- **Storage**: Supabase Storage via `@supabase/supabase-js` — private bucket, backend-mediated download. Credentials deferred; guarded with `requireStorage` returning 503 when absent.
- **Supervisor** runs Node backend, React frontend, and MongoDB.

## Core requirements (static)
- Multi-location routing (`/`, `/rewari`, `/rewari/about`, ...) with subdomain resolver + visible location switcher.
- Config-driven branding & copy in `frontend/src/data/siteConfig.js`.
- Responsive header/footer/nav with mobile menu.
- Language toggle EN/HI.
- Admin route guarded by token; UI-only Phase 1 shell was replaced with a functional admin media library.
- Public location APIs.
- Location-scoped media library (mathura/gallery, mathura/documents, rewari/gallery, rewari/documents).

## Implemented
- **2025-08-15** Phase 1 public skeleton (Mathura + Rewari), i18n toggle, SEO title updates, admin skeleton.
- **2025-08-15** Rewari intro About-link fix (preserves location context).
- **2026-01-16** Backend migration FastAPI → Node.js Express + Mongoose (all Phase 1 endpoints ported).
- **2026-01-16** Supabase Storage integration (contract + UI):
  - `POST /api/admin/media/upload` (multipart, admin-only, storage-guarded)
  - `GET /api/admin/media?location=&category=` (admin-only list, `_id` scrubbed)
  - `GET /api/admin/media/:id/download?token=&inline=` (admin token via query for `<img>`/`<a>`; backend-streamed; no Supabase URLs leaked)
  - `DELETE /api/admin/media/:id` (soft-delete + storage remove)
  - `GET /api/admin/media/status` (public health)
  - `FileAsset` Mongo model with UUID `id`, `is_deleted`, timestamps, `location/category/is_deleted/createdAt` compound index.
  - MIME allow-lists (images: jpg/png/webp/gif; docs: pdf/doc/docx). Size limits 10 MB image / 15 MB doc.
- **2026-01-16** Admin Media Library UI (`/app/frontend/src/pages/AdminMedia.jsx`):
  - Token sign-in with server-side validation (401 shown inline).
  - Location & category tabs, drag-and-drop uploader with size hints, preview modal, copy URL, download, soft-delete, empty & "not configured" states.
  - Every interactive element has a unique `data-testid`.

## Verified
- Testing agent iteration 2: **16/16 backend tests pass**, admin UI flows verified, public regression clean.
- Report: `/app/test_reports/iteration_2.json`.
- Credentials: `/app/memory/test_credentials.md`.

## Backlog (P0 → P2)
- **P0** Add live Supabase credentials → re-test upload/download/delete end-to-end and 415/413 branches.
- **P1** Replace admin bearer token with proper auth (JWT or session) for production.
- **P1** Public Gallery & Documents pages consuming the same storage (read-only, per-location).
- **P1** Phase 2 pages: team, history, achievements, member directory, events, contact/forms.
- **P1** Location-scoped CRUD for members/events; contact/registration/donation forms.
- **P2** Analytics wiring (GA4 or Plausible).
- **P2** Seed real Mathura content once storage is live.

## Notes / Decisions
- Backend runtime switched to Node.js at user's explicit request.
- Original Angular request retained on backlog; React scaffold kept for velocity.
- Supabase private bucket: `mahawar-sabha` (default; override via `SUPABASE_BUCKET`).
- Download URLs embed the admin token via query string because `<img>` / `<a>` cannot set Authorization headers — flagged as a follow-up for signed URLs once creds are live.

## 2026-01-16 — Community Journal / Heritage Stories

- **Backend** (Node.js/Express + Mongoose):
  - Model `Story` (uuid `id`, unique slug, location, title/subtitle/body/excerpt, author, tags, coverUrl / coverAssetId, published, publishedAt, is_deleted).
  - Public routes: `GET /api/stories?location=`, `GET /api/stories/:slug`, `GET /api/stories/:slug/cover` (streams from Supabase when configured; 404 otherwise).
  - Admin routes (bearer `ADMIN_TOKEN`): `GET /admin/stories`, `GET /admin/stories/:id`, `POST /admin/stories`, `PUT /admin/stories/:id`, `DELETE /admin/stories/:id` (soft-delete + unpublish).
  - Slug auto-generation with uniqueness fallback; excerpt auto-computed on body change.
- **Frontend**:
  - Public `/stories` list and `/stories/:slug` detail with drop-cap paragraphs, cover fallback (Om symbol) and one-tap **Share on WhatsApp** (`wa.me/?text=...`) button + mini share button on each card.
  - Admin `/admin/stories` manager with new/edit/delete, publish toggle, live status pill.
  - Admin editor: title/subtitle/body (paragraph-per-blank-line), tags, author, cover upload via existing media pipeline, external URL fallback, storage-not-configured banner.
  - New `Journal` link in main nav (EN/HI).
- **Verified**: iteration 3 → 13/13 backend + full frontend flows via testing agent.

## 2026-01-16 — Supabase Storage went live

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` added to `/app/backend/.env`.
- Bucket `mahawar-sabha` created as Private on the user's Supabase project.
- End-to-end verified via curl: upload (114 KB image) → list → backend-streamed download (200 image/jpeg, byte-exact) → 415 for text/plain into gallery → 204 delete.
- Story cover pipeline verified: uploaded image to `mathura/gallery`, attached `coverAssetId` to the seed story, `GET /api/stories/:slug/cover` streams from Supabase publicly (200 image/jpeg, 197 KB).
- Multer `parts` limit raised to 20 (was 3) after `LIMIT_PART_COUNT` on multipart with 2 fields + 1 file. Error handler now returns 400 with the specific `LIMIT_*` code instead of a generic 500.
- Seed story cover cleared to showcase the elegant OM fallback design; admin can upload real covers via `/admin/stories` editor whenever they like.

## 2026-01-16 (later) — Split-deployment architecture

- Emergent deployment failed because the production container ships **Python only** — Node.js is not installed and Emergent doesn't support custom Dockerfiles or a Node runtime today (confirmed via support_agent).
- User's decision: Node.js backend stays. To ship on Emergent while keeping Node:
  - **Backend**: Node.js Express + MongoDB Atlas → hosted on Railway at `https://mahawar-sabha-webapp-production.up.railway.app` (all business logic, Supabase Storage integration, admin auth, media, journal).
  - **Emergent side**: 20-line FastAPI health stub only (`server.py` — GET /health returning {ok:true}). No business logic. Required because Emergent's deployment probe targets port 8001 and frontend-only deployment isn't supported.
  - **Frontend**: `REACT_APP_BACKEND_URL=https://mahawar-sabha-webapp-production.up.railway.app` — all XHRs go to Railway.
- Verified in iteration 4: **25/25 backend tests pass** (stub + real Supabase upload/download/delete roundtrip on Railway) and full frontend Playwright flows pass; browser network trace confirmed traffic flows to Railway.
- Added `.gitignore` at repo root to keep secrets/logs/build artifacts out of version control.
