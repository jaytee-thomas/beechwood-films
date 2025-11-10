import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to Postgres");
}

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// --- Detect if SSL is required ---
const shouldUseSSL = (() => {
  const flag = (process.env.PGSSLMODE || process.env.PG_SSL || "").toLowerCase();
  if (flag === "disable" || flag === "false") return false;
  if (flag === "require" || flag === "true") return true;

  // 👇 Updated regex includes Railway domains
  return /(neon\.tech|supabase\.co|railway\.app|rlwy\.net|proxy\.rlwy\.net|vercel-storage\.com)/i.test(connectionString);
})();

const pool = new Pool({
  connectionString,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
  max: parseNumber(process.env.PG_POOL_MAX, 10),
  idleTimeoutMillis: parseNumber(process.env.PG_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: parseNumber(process.env.PG_CONNECTION_TIMEOUT_MS, 10_000)
});

pool.on("error", (err) => {
  console.error("[pg] Unexpected error on idle client", err);
});

export const query = (text, params = []) => pool.query(text, params);

export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

// --- Optional: Retry logic for cold Railway boots ---
const testConnection = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT NOW()");
      console.log("[pg] Connected to database ✅");
      return;
    } catch (err) {
      console.warn(`[pg] Connection failed (${i + 1}/${retries}), retrying...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Could not connect to Postgres after multiple retries");
};

testConnection().catch((err) => {
  console.error("[pg] Startup connection failed", err);
  process.exit(1);
});

export default pool;