import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import * as z from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable, type ShortLink } from "../db/schema.js";
import redis from "../db/redis-instance.js";

const app = new Hono();

const schema = z.object({
  url: z.url(),
});

app.post("/url", sValidator("json", schema), async (c) => {
  const ONE_DAY_TIME = 1000 * 60 * 60 * 24;
  const { url } = await c.req.json();
  const slug = nanoid();
  const expiredAt = Date.now() + ONE_DAY_TIME;
  const record = {
    url,
    slug,
    expiredAt: new Date(expiredAt),
  };

  try {
    await db.insert(shortLinkTable).values(record);
    redis.set(slug, JSON.stringify(record));

    return c.json(record);
  } catch (err) {
    console.log(err);
    return c.text("Failed create short link", 500);
  }
});

const schemaGetLinkBySlug = z.object({
  slug: z.string().nonempty(),
});

app.get("/:slug", sValidator("param", schemaGetLinkBySlug), async (c) => {
  const slug = await c.req.param("slug");
  const shortLinkCache = await redis.get(slug);
  let shortLink: ShortLink | undefined = shortLinkCache
    ? JSON.parse(shortLinkCache)
    : undefined;

  if (!shortLink) {
    [shortLink] = await db
      .select()
      .from(shortLinkTable)
      .where(eq(shortLinkTable.slug, slug));

    await redis.set(slug, JSON.stringify(shortLink));
  }

  if (!shortLink) {
    return c.json({ message: "not found" }, 404);
  }

  const { url, expiredAt } = shortLink;

  if (new Date(expiredAt) < new Date()) {
    return c.json({ message: "not found" }, 404);
  }

  return c.redirect(url);
});

export default app;
