import { withTransaction } from "./pool.js";

// ===== BASE MIGRATIONS =====
const statements = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    notify_on_new_video BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_idx
     ON users ((lower(email)))`,
  `CREATE INDEX IF NOT EXISTS users_notify_idx
     ON users (notify_on_new_video)
     WHERE notify_on_new_video IS TRUE`,

  // Videos table (base structure)
  `CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    s3_key TEXT,
    thumbnail_url TEXT,
    duration_seconds INT,
    published BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`
];

// ===== P1 EXTENSIONS (R2 + metadata) =====
statements.push(
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS file_name TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS size_bytes BIGINT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS width INT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS height INT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'custom'`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS r2_key TEXT`
);

let migrationPromise = null;

// ===== MIGRATION EXECUTION =====
const runMigrations = async () => {
  await withTransaction(async (client) => {
    for (const statement of statements) {
      await client.query(statement);
    }
  });
  console.log("[pg] migrations applied");
};

// ===== EXPORT =====
export const migrate = async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }
  return migrationPromise;
};