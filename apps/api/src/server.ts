import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { auth } from "./lib/auth.js"; // path to your auth file
import "./db/redis-instance.js";
import shortLink from "./routers/shortLink.js";
import getShortLink from "./routers/getShortLink.js";
import { cors } from "hono/cors";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// enable CORS for any API route (allow all origins)
app.use("/api/*", cors({ origin: "http://localhost:5173", credentials: true }));

// Serve static assets from the React build
app.use("/assets/*", serveStatic({ root: "../web/dist" }));
app.get("/", serveStatic({ path: "../web/dist/index.html" }));

// SPA fallback — serve index.html for unmatched routes in production
if (process.env.NODE_ENV === "production") {
  app.use("*", serveStatic({ path: "../web/dist/index.html" }));
}

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const route = app.route("/", getShortLink).route("/api", shortLink);
export type AppType = typeof route;

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
