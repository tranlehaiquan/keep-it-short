import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import * as z from "zod";
import { nanoid } from "nanoid";
import db from "../db/index.js";
import { shortLinkTable } from "../db/schema.js";

const app = new Hono();

const schema = z.object({
  url: z.url(),
});

app.post("/", sValidator("json", schema), async (c) => {
  const ONE_DAY_TIME = 1000 * 60 * 60 * 24;
  const { url } = await c.req.json();
  const slug = nanoid();
  const expiredAt = Date.now() + ONE_DAY_TIME;
  const values = {
    url,
    slug,
    expiredAt: new Date(expiredAt),
  };

  try {
    await db.insert(shortLinkTable).values(values);
    return c.json(values);
  } catch (err) {
    console.log(err);
    return c.text("Failed create short link", 500);
  }
});

export default app;
