import { createClient } from "redis";

const client = createClient({
  password: process.env.REDIS_PASSWORD || "redis_secure_password",
  url: process.env.REDIS_URL,
});
client.on("ready", () => {
  console.log("[redis] standalone ready.");
});

await client.connect(); // Requires explicit connection.

export default client;
