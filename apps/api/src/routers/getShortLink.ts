import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable, type ShortLink } from "../db/schema/short-link.js";
import { clickEventTable } from "../db/schema/click-event.js";
import redis from "../db/redis-instance.js";

const app = new Hono().get("/:slug{[0-9A-Za-z_-]{4,16}}", async (c) => {
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
        await redis.set(slug, "NOT_FOUND", { EX: 60 });
        return c.json({ message: "Link not found or expired" }, 404);
      }
    } else {
      await redis.set(slug, "NOT_FOUND", { EX: 60 });
      return c.json({ message: "Link not found or expired" }, 404);
    }
  }

  const clickEvent = {
    slug,
    userAgent: c.req.header("user-agent") ?? null,
    referer: c.req.header("referer") ?? null,
  };

  await Promise.all([
    db
      .update(shortLinkTable)
      .set({ clickCount: sql`${shortLinkTable.clickCount} + 1` })
      .where(eq(shortLinkTable.slug, slug))
      .execute()
      .catch((err) => console.error("Click count error:", err)),
    db
      .insert(clickEventTable)
      .values(clickEvent)
      .execute()
      .catch((err) => console.error("Click event error:", err)),
  ]);

  return c.redirect(shortLink.url);
});

export default app;
