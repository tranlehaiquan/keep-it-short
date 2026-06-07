import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
});
client.on("ready", () => {
  console.log("[redis] standalone ready.");
});

await client.connect(); // Requires explicit connection.

export default client;
