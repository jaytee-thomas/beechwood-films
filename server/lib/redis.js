import IORedis from "ioredis";

const REDIS_URL = process.env.QUEUE_REDIS_URL || "";

const parseRedisUrl = (url) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.slice(1) || 0) : undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null
    };
  } catch (error) {
    console.error("[redis] Failed to parse QUEUE_REDIS_URL:", error);
    return null;
  }
};

const connectionOptions = REDIS_URL ? parseRedisUrl(REDIS_URL) : null;
let healthClient = null;

const ensureHealthClient = () => {
  if (!REDIS_URL) return null;
  if (!healthClient) {
    healthClient = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true
    });
    healthClient.on("error", (err) => {
      console.error("[redis] connection error", err);
    });
  }
  return healthClient;
};

export const getRedisConnection = () => connectionOptions;
export const redisConnection = connectionOptions;
export const isRedisEnabled = () => Boolean(connectionOptions);

export const getRedisHealth = async () => {
  if (!isRedisEnabled()) {
    return {
      enabled: false,
      ready: true,
      mode: "inline"
    };
  }
  const client = ensureHealthClient();
  if (!client) {
    return {
      enabled: true,
      ready: false,
      error: "Redis client unavailable"
    };
  }
  try {
    if (client.status !== "ready") {
      await client.connect();
    }
    const start = Date.now();
    await client.ping();
    return {
      enabled: true,
      ready: true,
      latencyMs: Date.now() - start
    };
  } catch (error) {
    return {
      enabled: true,
      ready: false,
      error: error.message
    };
  }
};

export const closeRedisHealthClient = async () => {
  if (healthClient) {
    await healthClient.quit();
    healthClient = null;
  }
};
