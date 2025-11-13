import { query } from "./pool.js";

const now = () => Date.now();

const toJson = (value, fallback = "{}") => {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};

const serializeError = (error) => {
  if (!error) return null;
  if (typeof error === "string") return JSON.stringify({ message: error });
  return JSON.stringify({
    message: error.message || String(error),
    stack: error.stack,
    code: error.code || null
  });
};

export const logEnqueued = async ({
  jobId,
  queue = "video",
  type,
  videoId = null,
  actorEmail = null,
  actorUserId = null,
  payload = null,
  maxRetries = Number(process.env.WEBHOOK_MAX_RETRIES || 3)
}) => {
  await query(
    `
    INSERT INTO video_jobs (
      job_id,
      queue,
      type,
      status,
      actor_email,
      actor_user_id,
      video_id,
      created_at,
      attempts,
      max_retries,
      payload
    )
    VALUES (
      $1,
      $2,
      $3,
      'queued',
      $4,
      $5,
      $6,
      $7,
      0,
      $8,
      $9::jsonb
    )
    ON CONFLICT (job_id) DO UPDATE
      SET status = 'queued',
          actor_email = EXCLUDED.actor_email,
          actor_user_id = EXCLUDED.actor_user_id,
          video_id = COALESCE(EXCLUDED.video_id, video_jobs.video_id),
          payload = COALESCE(EXCLUDED.payload, video_jobs.payload),
          max_retries = EXCLUDED.max_retries,
          created_at = LEAST(video_jobs.created_at, EXCLUDED.created_at)
    `,
    [
      jobId,
      queue,
      type,
      actorEmail,
      actorUserId,
      videoId,
      now(),
      maxRetries,
      toJson(payload)
    ]
  );
};

export const logStarted = async ({ jobId, attempts = 1 }) => {
  await query(
    `
    UPDATE video_jobs
       SET status = 'running',
           started_at = COALESCE(started_at, $2),
           attempts = GREATEST($3, attempts)
     WHERE job_id = $1
    `,
    [jobId, now(), attempts]
  );
};

export const logProgress = async ({ jobId, progress }) => {
  const pct = Number(progress) || 0;
  await query(
    `
    UPDATE video_jobs
       SET result = jsonb_set(
             COALESCE(result, '{}'::jsonb),
             '{lastProgress}',
             to_jsonb($2::int),
             true
           )
     WHERE job_id = $1
    `,
    [jobId, pct]
  );
};

export const logCompleted = async ({ jobId, startedAt = null, result = null }) => {
  await query(
    `
    UPDATE video_jobs
       SET status = 'succeeded',
           finished_at = $2,
           result = COALESCE($3::jsonb, result),
           attempts = GREATEST(attempts, 1)
     WHERE job_id = $1
    `,
    [jobId, now(), result != null ? toJson(result, "null") : null]
  );
};

export const logFailed = async ({ jobId, startedAt = null, error = null }) => {
  await query(
    `
    UPDATE video_jobs
       SET status = 'failed',
           finished_at = $2,
           error = $3::jsonb,
           attempts = attempts + 1
     WHERE job_id = $1
    `,
    [jobId, now(), serializeError(error)]
  );
};

export const getRecent = async ({ limit = 50 } = {}) => {
  const cappedLimit = Math.max(1, Number(limit) || 50);
  const { rows } = await query(
    `
    SELECT
      job_id,
      queue,
      type,
      status,
      actor_email,
      actor_user_id,
      video_id,
      created_at,
      started_at,
      finished_at,
      attempts
    FROM video_jobs
    ORDER BY COALESCE(finished_at, created_at) DESC
    LIMIT $1
    `,
    [cappedLimit]
  );
  return rows;
};
