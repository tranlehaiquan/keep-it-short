import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "./db/redis-instance.js";
import shortLink from "./routers/shortLink.js";
import { Layout } from "./components/Layout.js";
import { Home } from "./components/Home.js";

const app = new Hono();

app.get("/", (c) => {
  return c.html(
    Layout({ 
      title: "Keep It Short - URL Shortener", 
      children: Home() 
    })
  );
});

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
