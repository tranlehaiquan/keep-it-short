import { Hono } from "hono";
import * as z from "zod";
import db from "../db/index.js";
import { shortLinkTable } from "../db/schema.js";
import { sValidator } from "@hono/standard-validator";
import { eq } from "drizzle-orm";

const app = new Hono();

const schema = z.object({
  slug: z.string().nonempty(),
});

app.get("/:slug", sValidator("param", schema), async (c) => {
  const slug = await c.req.param("slug");
  const [shortLink] = await db
    .select()
    .from(shortLinkTable)
    .where(eq(shortLinkTable.slug, slug));

  if (!shortLink) {
    return c.json({ message: "not found" }, 404);
  }

  const { url } = shortLink;

  return c.redirect(url);
});

export default app;
