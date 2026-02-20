import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import "./db/redis-instance.js";
import shortLink from "./routers/shortLink.js";

const app = new Hono();

// Serve static assets from the React build
app.use("/assets/*", serveStatic({ root: "../web/dist" }));

// Serve the React app for the root route
app.get("/", serveStatic({ path: "../web/dist/index.html" }));

app.route("/", shortLink);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
