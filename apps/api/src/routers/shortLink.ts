import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable, type ShortLink } from "../db/schema.js";
import redis from "../db/redis-instance.js";

const app = new Hono();

const createSchema = z.object({
  url: z.url(),
  expiredAt: z.iso.datetime().optional(),
});

app.post("/url", zValidator("json", createSchema), async (c) => {
  const { url, expiredAt: customExpiredAt } = c.req.valid("json");

  const expiredAtDate = customExpiredAt
    ? new Date(customExpiredAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const slug = nanoid();

  const record = {
    url,
    slug,
    expiredAt: expiredAtDate,
    clickCount: 0,
  };

  try {
    await db.insert(shortLinkTable).values(record);

    const ttlSeconds = Math.floor(
      (expiredAtDate.getTime() - Date.now()) / 1000,
    );
    if (ttlSeconds > 0) {
      await redis.set(slug, JSON.stringify(record), { EX: ttlSeconds });
    }

    return c.json(
      {
        slug: record.slug,
        shortUrl: `${new URL(c.req.url).origin}/${record.slug}`,
        expiredAt: record.expiredAt,
      },
      201,
    );
  } catch (err) {
    console.error("DB Error:", err);
    return c.json({ error: "Failed to create short link" }, 500);
  }
});

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
