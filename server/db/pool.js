import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect to Postgres");
}

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shouldUseSSL = (() => {
  const flag = (process.env.PGSSLMODE || process.env.PG_SSL || "").toLowerCase();
  if (flag === "disable" || flag === "false") return false;
  if (flag === "require" || flag === "true") return true;
  return /(neon\.tech|supabase\.co|railway\.app|vercel-storage\.com)/i.test(connectionString);
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

export default pool;
