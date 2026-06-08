import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";
import { nanoid } from "nanoid";
import { desc, eq, and } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable } from "../db/schema/short-link.js";
import redis from "../db/redis-instance.js";
import type { auth } from "../lib/auth.js";

const slugSchema = z
  .string()
  .min(4)
  .max(16)
  .regex(/^[0-9A-Za-z_-]+$/);

const createSchema = z.object({
  url: z
    .string()
    .transform((url) => {
      return url.match(/^https?:\/\//i) ? url : `https://${url}`;
    })
    .pipe(z.url()),
  slug: slugSchema.optional(),
  expiredAt: z.iso.datetime().optional(),
});

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>()
  .post("/url", zValidator("json", createSchema), async (c) => {
    const { url, expiredAt: customExpiredAt, slug: customSlug } = c.req.valid("json");
    const user = c.get("user");

    const expiredAtDate = customExpiredAt
      ? new Date(customExpiredAt)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const slug = customSlug ?? nanoid(6);

    if (customSlug) {
      const [existingBySlug, existingInRedis] = await Promise.all([
        db
          .select({ slug: shortLinkTable.slug })
          .from(shortLinkTable)
          .where(eq(shortLinkTable.slug, customSlug))
          .limit(1),
        redis.get(customSlug),
      ]);

      if (existingBySlug.length > 0 || (existingInRedis && existingInRedis !== "NOT_FOUND")) {
        return c.json({ error: "This custom slug is already taken. Please choose another one." }, 409);
      }
    }

    const record = {
      url,
      slug,
      expiredAt: expiredAtDate,
      clickCount: 0,
      createdBy: user?.id,
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
          shortUrl: `${process.env.BASE_URL ?? new URL(c.req.url).origin}/c/${record.slug}`,
          expiredAt: record.expiredAt,
        },
        201,
      );
    } catch (err) {
      console.error("DB Error:", err);
      return c.json({ error: "Failed to create short link" }, 500);
    }
  })
  .get("/url/history", async (c) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const history = await db
      .select()
      .from(shortLinkTable)
      .where(eq(shortLinkTable.createdBy, user.id))
      .orderBy(desc(shortLinkTable.createdAt));

    return c.json({ items: history });
  })
  .delete("/url/:slug", async (c) => {
    const user = c.get("user");
    const slug = c.req.param("slug");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [link] = await db
      .select()
      .from(shortLinkTable)
      .where(and(eq(shortLinkTable.slug, slug), eq(shortLinkTable.createdBy, user.id)))
      .limit(1);

    if (!link) {
      return c.json({ error: "Not found" }, 404);
    }

    await db.delete(shortLinkTable).where(eq(shortLinkTable.slug, slug));
    await redis.del(slug);

    return c.json({ success: true });
  });

export default app;
