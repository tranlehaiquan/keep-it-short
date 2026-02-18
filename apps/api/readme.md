# Short Link Service — MVP System Design

## Overview

A high-performance URL shortener built with Node.js. Designed with a skewed read/write ratio in mind (~1000:1), with Redis caching as the core performance strategy.

---

## Tech Stack

| Layer     | Choice     | Reason                                                      |
| --------- | ---------- | ----------------------------------------------------------- |
| Framework | Hono       | Faster than Express, built-in JSON schema validation        |
| Database  | PostgreSQL | Robust, great support for unique constraints and timestamps |
| Cache     | Redis      | Sub-millisecond key-value lookups, perfect for slug → url   |
| Slug      | nanoid     | Simple, collision-resistant random string generation        |

---

## Database Schema

```sql
ShortLink
├── id          INT           -- PK, internal only, never exposed
├── slug        VARCHAR(6)    -- Unique, indexed — the short code e.g. "Xk9mP2"
├── url         VARCHAR(2048) -- Origin URL (2048 = safe browser max)
├── clickCount  INT           -- Default 0, lightweight analytics
├── createdAt   TIMESTAMP     -- Full timestamp, not date-only
└── expiredAt   TIMESTAMP     -- Nullable, null = never expires
```

**Notes:**

- `slug` must have a **unique index** — it's the most queried column
- `expiredAt` is nullable — if null, the link lives forever
- `id` is never exposed in any API response or URL

---

## Slug Generation

- **Strategy:** Random `nanoid`
- **Length:** 6 characters
- **Alphabet:** Default nanoid (A-Z, a-z, 0-9, `-`, `_`) = 64 chars
- **Combinations:** 64⁶ ≈ 68 billion — safe at MVP scale

```js
import { nanoid } from "nanoid";

const slug = nanoid(6); // e.g. "Xk9mP2"
```

**Collision handling:** On `POST /url`, if a unique constraint violation occurs, retry once with a newly generated slug. Simple and bulletproof.

---

## API Design

### `POST /url`

Creates a new short link.

**Request body:**

```json
{
  "url": "https://example.com/very/long/path",
  "expiredAt": "2025-12-31T00:00:00Z" // optional
}
```

**Response `201`:**

```json
{
  "slug": "Xk9mP2",
  "shortUrl": "https://yourdomain.com/Xk9mP2",
  "expiredAt": "2025-12-31T00:00:00Z"
}
```

---

### `GET /:slug`

Resolves and redirects to the origin URL.

- Returns `302` redirect → enables accurate click tracking
- Returns `404` if slug not found or link is expired
- Checks `expiredAt` before redirecting

---

## Read Flow (Critical Path)

Every `GET /:slug` follows this flow:

```
Incoming request
      │
      ▼
 Redis cache?
   ├── HIT  ──► 302 redirect (~1ms)
   └── MISS
         │
         ▼
    Query DB
         │
         ├── Not found / expired ──► 404
         │
         └── Found
               │
               ▼
         Populate cache (TTL mirrors expiredAt)
               │
               ▼
         302 redirect (~10–20ms)
```

This is the heart of the system. Most requests never touch the database.

---

## Folder Structure

```
src/
├── routes/
│   └── url.route.js         # Defines endpoints, points to controller
├── controllers/
│   └── url.controller.js    # Handles HTTP in/out, input validation
├── services/
│   └── url.service.js       # Business logic (slug gen, expiry check, click count)
├── repositories/
│   └── url.repository.js    # All DB queries — nothing else touches the DB
├── middlewares/
│   └── rateLimit.js         # Rate limiting on POST /url
├── utils/
│   └── cache.js             # Redis client and cache helpers
└── app.js
```

**Layer responsibilities:**

- **Route** — endpoint definition only
- **Controller** — HTTP interface, validation, response shaping
- **Service** — business logic, orchestrates cache + repository
- **Repository** — pure DB access, no business logic
- **Cache util** — Redis get/set/del, TTL management

---

## Middleware

### Rate Limiting

Apply to `POST /url` to prevent DB spam.

- Tool: `express-rate-limit` or a Redis-based sliding window
- Recommended limit: ~10 requests/minute per IP at MVP

---

## Future Considerations (Post-MVP)

These are out of scope for MVP but worth keeping in mind architecturally:

- **Auth / User accounts** — add `userId` FK to `ShortLink` table
- **Click analytics** — async job via BullMQ to record click metadata (IP, user-agent, timestamp) without blocking the redirect
- **Bloom filter** — reject dead slug lookups instantly before hitting cache or DB
- **Separate read/write services** — reads and writes scale very differently; the monolith structure above makes this refactor straightforward
- **Custom slugs** — allow users to define their own slug instead of random nanoid
