import { serve } from "@hono/node-server";
import { Hono } from "hono";
import shortLink from "./routers/shortLink.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/url", shortLink);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
