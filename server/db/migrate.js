// server/db/migrate.js
import { withTransaction } from "./pool.js";

/**
 * Idempotent migrations for Postgres.
 * Matches the production shape you've already created:
 *  - videos: UUID pk + upload/R2 fields + jsonb tags
 *  - fallback_videos: legacy snapshot table + jsonb tags
 *  - helpful indexes/uniques
 */

const statements = [
  // ----- users -----
  `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    notify_on_new_video BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_idx
    ON users ((lower(email)))
  `,
  `
  CREATE INDEX IF NOT EXISTS users_notify_idx
    ON users (notify_on_new_video)
    WHERE notify_on_new_video IS TRUE
  `,

  // ----- videos (base create matching prod) -----
  `
  CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    s3_key TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    file_name TEXT,
    size_bytes BIGINT,
    width INT,
    height INT,
    status TEXT DEFAULT 'draft',
    provider TEXT NOT NULL DEFAULT 'custom',
    r2_key TEXT,
    preview_src TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb
  )
  `,

  // Be tolerant if an older DB exists with slight drift
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS title TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS s3_key TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS created_at BIGINT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS updated_at BIGINT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS file_name TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS size_bytes BIGINT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS width INT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS height INT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'custom'`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS r2_key TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS preview_src TEXT`,
  `ALTER TABLE IF EXISTS videos ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`,

  // constraints / indexes (idempotent)
  `CREATE UNIQUE INDEX IF NOT EXISTS videos_s3_key_key ON videos (s3_key)`,
  `CREATE INDEX IF NOT EXISTS idx_videos_published_created ON videos (published, created_at DESC)`,

  // ----- fallback snapshots (legacy list used for seed/snapshot) -----
  `
  CREATE TABLE IF NOT EXISTS fallback_videos (
    position INT PRIMARY KEY,
    title TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    src TEXT,
    provider TEXT,
    provider_id TEXT,
    thumbnail TEXT,
    library TEXT,
    source TEXT,
    duration TEXT,
    date TEXT,
    description TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    file_name TEXT
  )
  `,

  // in case tags was missing before
  `ALTER TABLE IF EXISTS fallback_videos ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`
];

// Single-flight runner
let migrationPromise = null;

const runMigrations = async () => {
  await withTransaction(async (client) => {
    for (const sql of statements) {
      await client.query(sql);
    }
  });
  console.log("[pg] migrations applied");
};

export const migrate = async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((err) => {
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
};