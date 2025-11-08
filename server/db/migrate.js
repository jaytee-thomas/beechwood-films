import { withTransaction } from "./pool.js";

const statements = [
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
     WHERE notify_on_new_video IS TRUE`
];

let migrationPromise = null;

const runMigrations = async () => {
  await withTransaction(async (client) => {
    // === USERS TABLE MIGRATIONS ===
    for (const statement of statements) {
      await client.query(statement);
    }

    // === VIDEOS TABLE MIGRATIONS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        s3_key TEXT UNIQUE,
        thumbnail_url TEXT,
        duration_seconds INTEGER,
        published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_published_created
      ON videos (published, created_at DESC);
    `);
  });

  console.log("[pg] migrations applied");
};

export const migrate = async () => {
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }
  return migrationPromise;
};