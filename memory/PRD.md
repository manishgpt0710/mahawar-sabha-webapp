# Mahawar Sabha Website — Phase 1 PRD

## Original problem statement
Build a location-aware Mahawar Sabha website with Rewari and Mathura support, subdomain or route resolution, config-driven branding/content, responsive public layouts, Hindi/English i18n, SEO, analytics readiness, and authentication/admin skeletons. Deliver Phase 1 plus the first Mathura home/about pages.

## Architecture decisions
- Preserved the workspace React service runtime so the working preview and supervisor-managed frontend remain compatible; organized the implementation with location context/config patterns that can be migrated to Angular later if the service scaffold is replaced.
- Location config is centralized in `frontend/src/data/siteConfig.js`; resolution checks hostname subdomain first, then route segment, then defaults to Mathura.
- Backend exposes a small config-driven location API backed by in-memory dummy JSON-style data for Phase 1.
- Authentication is intentionally a route-guard/admin shell only, with no demo accounts.

## Implemented
- Mathura homepage with cultural hero, community pillars, quote section, responsive footer, and About route.
- Rewari placeholder homepage and location-aware About page.
- Location switcher with Mathura/Rewari fallback routing.
- Hindi/English toggle across navigation and key public copy.
- Admin space skeleton with protected-space messaging.
- Backend `/api/`, `/api/locations`, and `/api/locations/{slug}` endpoints.
- SEO title, description, theme color, responsive styling, and analytics-ready page structure.
- Verified with production build, JS/Python lint/compile, browser smoke tests, and focused Rewari link regression.

## Prioritized backlog
- P0: Replace admin shell with real authentication and route guards.
- P1: Add Mathura team, history, achievements, events, gallery, contact, and member directory pages.
- P1: Move location content from dummy data to persisted location-scoped entities and CRUD APIs.
- P1: Add Supabase storage for images/documents and contact/registration/donation forms.
- P2: Add richer analytics events and per-location SEO/schema metadata.
- P2: Add custom domain/subdomain deployment mapping and Angular migration only if the runtime scaffold is intentionally replaced.
