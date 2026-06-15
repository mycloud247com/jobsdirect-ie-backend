import Redis from "ioredis";

let client = null;

export function getRedis() {
  if (client) return client;

  const host = process.env.REDIS_HOST || "localhost";
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASS || undefined;
  const db = Number(process.env.REDIS_DB) || 0;

  client = new Redis({
    host,
    port,
    password,
    db,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Redis] Error:", err.message);
    }
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  client.connect().catch(() => {
    console.warn("[Redis] Could not connect — view tracking disabled");
    client = null;
  });

  return client;
}

export function isRedisAvailable() {
  return client && client.status === "ready";
}
