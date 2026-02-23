import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable, type ShortLink } from "../db/schema/short-link.js";
import redis from "../db/redis-instance.js";

const app = new Hono();

app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const cached = await redis.get(slug);

  if (cached === "NOT_FOUND") {
    return c.json({ message: "Link not found or expired" }, 404);
  }

  let shortLink: ShortLink | null = null;
  if (cached) {
    try {
      shortLink = JSON.parse(cached);
    } catch (e) {
      console.error("Error parsing cached shortLink:", e);
      // If cached data is corrupted or invalid JSON, treat as a cache miss
    }
  }

  if (!shortLink) {
    const [shortLinkFromDB] = await db
      .select()
      .from(shortLinkTable)
      .where(eq(shortLinkTable.slug, slug))
      .limit(1);

    if (shortLinkFromDB) {
      shortLink = shortLinkFromDB;
      const ttlSeconds = Math.floor(
        (new Date(shortLink.expiredAt).getTime() - Date.now()) / 1000,
      );

      if (ttlSeconds > 0) {
        await redis.set(slug, JSON.stringify(shortLink), { EX: ttlSeconds });
      } else {
        // Link found in DB but expired, set negative cache
        await redis.set(slug, "NOT_FOUND", { EX: 60 });
        return c.json({ message: "Link not found or expired" }, 404);
      }
    } else {
      // Slug not found in DB at all, set negative cache
      await redis.set(slug, "NOT_FOUND", { EX: 60 });
      return c.json({ message: "Link not found or expired" }, 404);
    }
  }

  db.update(shortLinkTable)
    .set({ clickCount: sql`${shortLinkTable.clickCount} + 1` })
    .where(eq(shortLinkTable.slug, slug))
    .execute()
    .catch((err) => console.error("Analytics error:", err));

  return c.redirect(shortLink.url);
});

export default app;
