# Feature Roadmap

## Quick Wins

- [x] ### Custom Slugs
  Let users define their own short code instead of auto-generated nanoid.  
  **Changes:** Add optional `slug` field to `POST /api/url`, validate uniqueness + format (alphanumeric, 4-16 chars).

- [x] ### Dark Mode
  `next-themes` is already a dependency. Wire up the `<ThemeProvider>` and a theme toggle button.  
  **Changes:** Wrap the app in `ThemeProvider`, add a toggle to `Header`, update Tailwind for `class` strategy.

- [x] ### Toast Notifications
  `sonner` is already installed. Replace inline error/success states with toast notifications.  
  **Changes:** Add `<Toaster />` in `App.tsx`, call `toast.success()` / `toast.error()` instead of inline banners.

- [ ] ### GitHub OAuth
  Config is already commented out in `apps/api/src/lib/auth.ts:27-32`. Uncomment and configure env vars.  
  **Changes:** Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` env vars, uncomment the `socialProviders` block, add a "Sign in with GitHub" button.

- [x] ### Link Deletion
  No endpoint to remove a link. Add soft-delete or hard-delete for the link owner.  
  **Changes:** `DELETE /api/url/:slug` endpoint, check `createdBy` matches auth user, invalidate Redis cache.

---

## Medium Effort

- [ ] ### Pagination for History
  `GET /api/url/history` returns all links unfiltered. Add cursor-based or offset pagination.  
  **Changes:** Add `limit` / `offset` query params, return `hasMore` / `total`, infinite scroll on frontend.

- [x] ### Rate Limiting
  No abuse protection. Add per-IP or per-user rate limits on the shorten endpoint.  
  **Changes:** Redis-backed sliding window rate limiter on `POST /api/url`, configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_SECONDS` env vars.

- [x] ### Click Analytics
  `clickCount` is tracked per link. Add a stats page with charts (daily breakdown, browser/OS if tracked).  
  **Changes:** Store `click_events` table (timestamp, user-agent, referer), add `GET /api/url/:slug/stats`, simple chart UI.

- [x] ### Password Reset
  Better Auth supports it. Wire the reset flow in the frontend.  
  **Changes:** Add `forgot-password` and `reset-password` pages, call Better Auth's reset methods.

- [x] ### Link Editing
  Update target URL or expiration after a link is created.  
  **Changes:** `PATCH /api/url/:slug` with optional `url` / `expiredAt` fields, invalidate Redis cache.

---

## Larger Features

- [ ] ### Bulk URL Shortening
  Submit multiple URLs in one request, get all short links back.  
  **Changes:** `POST /api/url/bulk` accepting `{ urls: string[] }`, return array of results, multi-input UI.

- [ ] ### API Keys
  Let users generate tokens for programmatic access (e.g., `curl`).  
  **Changes:** `api_keys` table with FK to user, `POST /api/keys` to create, `DELETE /api/keys/:id` to revoke, middleware to authenticate `Authorization: Bearer <key>`.

- [ ] ### Link Preview Cards
  Fetch Open Graph metadata when shortening a URL (title, description, image).  
  **Changes:** Server-side OG scraper on `POST /api/url`, store `ogTitle` / `ogImage` / `ogDescription` columns, render cards in history + success view.
