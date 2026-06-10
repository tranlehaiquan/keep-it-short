import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import * as z from "zod";
import * as dns from "node:dns/promises";
import { nanoid } from "nanoid";
import { desc, eq, and, gte, sql } from "drizzle-orm";
import db from "../db/index.js";
import { shortLinkTable } from "../db/schema/short-link.js";
import { clickEventTable } from "../db/schema/click-event.js";
import redis from "../db/redis-instance.js";
import type { auth } from "../lib/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

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
  .post("/url", zValidator("json", createSchema), rateLimit, async (c) => {
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

      scrapeOpenGraph(url).then((ogData) => {
        if (!ogData) return;
        Promise.all([
          db
            .update(shortLinkTable)
            .set(ogData)
            .where(eq(shortLinkTable.slug, slug))
            .execute(),
          ttlSeconds > 0
            ? redis.set(slug, JSON.stringify({ ...record, ...ogData }), { EX: ttlSeconds })
            : Promise.resolve(),
        ]).catch((err) => console.error("OG update error:", err));
      }).catch((err) => console.error("OG scrape error:", err));

      return c.json(
        {
          slug: record.slug,
          shortUrl: `${process.env.BASE_URL ?? new URL(c.req.url).origin}/c/${record.slug}`,
          expiredAt: record.expiredAt,
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
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

    const limit = Math.min(Math.max(parseInt(c.req.query("limit") ?? "20", 10) || 20, 1), 100);
    const offset = Math.max(parseInt(c.req.query("offset") ?? "0", 10) || 0, 0);

    const [history, [{ count }]] = await Promise.all([
      db
        .select()
        .from(shortLinkTable)
        .where(eq(shortLinkTable.createdBy, user.id))
        .orderBy(desc(shortLinkTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(shortLinkTable)
        .where(eq(shortLinkTable.createdBy, user.id)),
    ]);

    const total = Number(count);
    const hasMore = offset + limit < total;

    return c.json({ items: history, total, hasMore });
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
  })
  .get("/url/:slug{[0-9A-Za-z_-]{4,16}}/stats", async (c) => {
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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const events = await db
      .select({
        timestamp: clickEventTable.timestamp,
        userAgent: clickEventTable.userAgent,
      })
      .from(clickEventTable)
      .where(and(eq(clickEventTable.slug, slug), gte(clickEventTable.timestamp, thirtyDaysAgo)))
      .orderBy(clickEventTable.timestamp);

    const dailyBreakdown: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};

    for (const event of events) {
      const day = event.timestamp.toISOString().split("T")[0];
      dailyBreakdown[day] = (dailyBreakdown[day] ?? 0) + 1;

      if (event.userAgent) {
        const browser = parseBrowser(event.userAgent);
        browserCounts[browser] = (browserCounts[browser] ?? 0) + 1;

        const os = parseOS(event.userAgent);
        osCounts[os] = (osCounts[os] ?? 0) + 1;
      } else {
        browserCounts["Unknown"] = (browserCounts["Unknown"] ?? 0) + 1;
        osCounts["Unknown"] = (osCounts["Unknown"] ?? 0) + 1;
      }
    }

    const daily = Object.entries(dailyBreakdown)
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const browsers = Object.entries(browserCounts)
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    const oses = Object.entries(osCounts)
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    return c.json({ daily, browsers, oses });
  })
  .patch("/url/:slug{[0-9A-Za-z_-]{4,16}}", zValidator("json", z.object({
    url: z
      .string()
      .transform((url) => url.match(/^https?:\/\//i) ? url : `https://${url}`)
      .pipe(z.url())
      .optional(),
    expiredAt: z.iso.datetime().optional(),
  }).refine((d) => d.url || d.expiredAt, { message: "Provide url or expiredAt" })), async (c) => {
    const user = c.get("user");
    const slug = c.req.param("slug");
    const { url, expiredAt } = c.req.valid("json");

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

    const updates: Record<string, unknown> = {};
    if (url) updates.url = url;
    if (expiredAt) updates.expiredAt = new Date(expiredAt);

    try {
      const [updated] = await db
        .update(shortLinkTable)
        .set(updates)
        .where(eq(shortLinkTable.slug, slug))
        .returning();

      await redis.del(slug);

      return c.json({
        slug: updated.slug,
        url: updated.url,
        expiredAt: updated.expiredAt,
        clickCount: updated.clickCount,
      });
    } catch (err) {
      console.error("Update error:", err);
      return c.json({ error: "Failed to update link" }, 500);
    }
  });

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua) && !/OPR\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/OPR\//.test(ua)) return "Opera";
  return "Other";
}

function parseOS(ua: string): string {
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua) || /macOS/.test(ua)) return "macOS";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "Linux";
  if (/Android/.test(ua)) return "Android";
  if (/iP(hone|ad|od)/.test(ua)) return "iOS";
  return "Other";
}

async function scrapeOpenGraph(
  url: string,
): Promise<{ ogTitle: string | null; ogDescription: string | null; ogImage: string | null } | null> {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null;

    const { address } = await dns.lookup(parsedUrl.hostname, { family: 4 });
    if (isPrivateIp(address)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "kis-bot/1.0 (OpenGraph fetcher)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;

    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (contentLength > 5 * 1024 * 1024) return null;

    const html = await res.text();
    if (html.length > 5 * 1024 * 1024) return null;

    const getMeta = (property: string) => {
      const regex = new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
        "i",
      );
      const match = html.match(regex);
      if (match) return match[1];
      const regex2 = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
        "i",
      );
      const match2 = html.match(regex2);
      return match2?.[1] ?? null;
    };

    const ogTitle = getMeta("og:title");
    const ogDescription = getMeta("og:description");
    const ogImage = getMeta("og:image");

    if (!ogTitle && !ogDescription && !ogImage) return null;

    return {
      ogTitle: ogTitle?.slice(0, 512) ?? null,
      ogDescription: ogDescription?.slice(0, 1024) ?? null,
      ogImage: ogImage?.slice(0, 2048) ?? null,
    };
  } catch {
    return null;
  }
}

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 127) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

export default app;
