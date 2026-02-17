import { serve } from "@hono/node-server";
import { Hono } from "hono";
import shortLink from "./routers/shortLink.js";
import getLink from "./routers/getLink.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/", getLink);
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
