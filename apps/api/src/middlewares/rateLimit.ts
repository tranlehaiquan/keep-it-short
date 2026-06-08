import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, Next } from "hono";
import redis from "../db/redis-instance.js";

const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10", 10);
const WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "60", 10);

const LUA_INCR_EXPIRE = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {c, redis.call('TTL', KEYS[1])}
` as const;

function getClientIP(c: Context): string {
  const info = getConnInfo(c);
  return info.remote.address ?? "127.0.0.1";
}

export async function rateLimit(c: Context, next: Next) {
  const ip = getClientIP(c);
  const key = `rate_limit:${ip}`;

  try {
    const [requests, ttl] = (await redis.eval(LUA_INCR_EXPIRE, {
      keys: [key],
      arguments: [String(WINDOW_SECONDS)],
    })) as [number, number];

    const remaining = Math.max(0, MAX_REQUESTS - requests);
    const resetAt = Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : WINDOW_SECONDS);

    c.header("X-RateLimit-Limit", String(MAX_REQUESTS));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(resetAt));

    if (requests > MAX_REQUESTS) {
      c.header("Retry-After", String(ttl > 0 ? ttl : WINDOW_SECONDS));
      return c.json(
        { error: "Too many requests. Please try again later." },
        429,
      );
    }
  } catch (err) {
    console.warn("[rate-limit] Redis unavailable, skipping rate limit:", err);
  }

  await next();
}
