import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { auth } from "./lib/auth.js"; // path to your auth file
import "./db/redis-instance.js";
import shortLink from "./routers/shortLink.js";
import { cors } from "hono/cors";

const app = new Hono();
// enable CORS for any API route (allow all origins)
app.use("/api/*", cors({ origin: "*" }));

// Serve static assets from the React build
app.use("/assets/*", serveStatic({ root: "../web/dist" }));
app.get("/", serveStatic({ path: "../web/dist/index.html" }));

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const routes = app.route("/", shortLink);
export type AppType = typeof routes;

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
