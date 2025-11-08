// server/scripts/seed-admin.js
import "dotenv/config";
import crypto from "crypto";
import { Pool } from "pg";

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

const DATABASE_URL = required("DATABASE_URL");           // Use Railway's value (public URL is OK)
const ADMIN_EMAIL   = required("ADMIN_EMAIL").toLowerCase();
const ADMIN_HASH    = required("ADMIN_PASSWORD_HASH");   // bcrypt hash, NOT plaintext

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const nowMs = () => Date.now();

const normalizeEmail = (e) => e.toLowerCase();

async function seedAdmin() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const emailNorm = normalizeEmail(ADMIN_EMAIL);

    const { rows } = await client.query(
      `SELECT * FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [emailNorm]
    );

    if (rows.length) {
      await client.query(
        `UPDATE users
           SET password = $1,
               role = 'admin',
               updated_at = $2
         WHERE id = $3`,
        [ADMIN_HASH, nowMs(), rows[0].id]
      );
      console.log(`[seed-admin] Updated existing admin: ${emailNorm}`);
    } else {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO users (id, email, password, name, role, notify_on_new_video, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'admin', false, $5, $6)`,
        [id, emailNorm, ADMIN_HASH, "Admin", nowMs(), nowMs()]
      );
      console.log(`[seed-admin] Inserted new admin: ${emailNorm}`);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[seed-admin] Failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();