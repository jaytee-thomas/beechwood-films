import { withTransaction } from "./pool.js";

// ===== BASE MIGRATIONS =====
const statements = [
  // Enable UUID generation
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,

  // === USERS TABLE ===
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

  // === VIDEOS TABLE ===
  `CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,

  `ALTER TABLE IF EXISTS videos
     ALTER COLUMN id SET DEFAULT gen_random_uuid()`,

  // === VIDEO EXTENSIONS ===
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS file_name TEXT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS size_bytes BIGINT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS width INT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS height INT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS preview_src TEXT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS s3_key TEXT`,
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS r2_key TEXT`,

  // === FALLBACK SNAPSHOTS ===
  `CREATE TABLE IF NOT EXISTS fallback_videos (
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
  )`,

  // === VIDEO JOB AUDIT (queue/worker telemetry) ===
  `
  CREATE EXTENSION IF NOT EXISTS pgcrypto
  `,
  `
  CREATE TABLE IF NOT EXISTS video_jobs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id        TEXT,
    queue         TEXT NOT NULL DEFAULT 'video',
    type          TEXT NOT NULL,
    tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
    actor_email   TEXT,
    actor_user_id UUID,
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    result        JSONB,
    error         JSONB,
    status        TEXT NOT NULL DEFAULT 'queued',
    attempts      INTEGER NOT NULL DEFAULT 0,
    max_retries   INTEGER NOT NULL DEFAULT 3,
    created_at    BIGINT NOT NULL,
    started_at    BIGINT,
    finished_at   BIGINT
  )
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'video_jobs_status_check'
    ) THEN
      ALTER TABLE video_jobs
        ADD CONSTRAINT video_jobs_status_check
        CHECK (status IN ('queued','running','succeeded','failed','cancelled'));
    END IF;
  END$$;
  `,
  `CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_video_jobs_status_created ON video_jobs (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_video_jobs_type_created ON video_jobs (type, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_video_jobs_actor_email_created ON video_jobs (actor_email, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_video_jobs_job_id ON video_jobs (job_id)`
];

// ===== MIGRATION EXECUTION =====
let migrationPromise = null;

const runMigrations = async () => {
  await withTransaction(async (client) => {
    for (const statement of statements) {
      const firstLine = statement.trim().split("\n")[0];
      console.log(`[pg:migrate] Running: ${firstLine}`);
      await client.query(statement);
    }
  });
  console.log("[pg] All migrations applied successfully.");
};

// ===== EXPORT =====
export const migrate = async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((error) => {
      console.error("[pg:migrate] Migration failed:", error);
      migrationPromise = null;
      throw error;
    });
  }
  return migrationPromise;
};
