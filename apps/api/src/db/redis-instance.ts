import { createClient } from "redis";

const client = createClient({
  password: process.env.REDIS_PASSWORD || "redis_secure_password",
});
client.on("ready", () => {
  console.log("[redis] standalone ready.");
});

await client.connect(); // Requires explicit connection.

export default client;
