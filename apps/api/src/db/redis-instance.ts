import { createClient } from "redis";

const client = createClient({
  password: process.env.REDIS_PASSWORD || "redis_secure_password",
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("[redis] max reconnection attempts reached");
        return new Error("max reconnection attempts reached");
      }
      const delay = Math.min(retries * 1000, 10000);
      console.warn(`[redis] reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
});

client.on("error", (err) => {
  console.error("[redis] client error:", err);
});

client.on("ready", () => {
  console.log("[redis] standalone ready.");
});

client.on("end", () => {
  console.warn("[redis] connection closed");
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("[redis] initial connection failed, will retry:", err);
  }
})();

export default client;
