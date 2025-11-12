import { query } from "./pool.js";

export const getQueueMetrics = async () => {
  const { rows } = await query(`
    WITH base AS (
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'succeeded' THEN 1 ELSE 0 END)::int AS succeeded,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed,
        AVG(
          CASE
            WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
            THEN (finished_at - started_at)
            ELSE NULL
          END
        )::bigint AS avg_duration_ms,
        AVG(GREATEST(attempts, 1))::numeric AS avg_attempts
      FROM video_jobs
    )
    SELECT
      total,
      succeeded,
      failed,
      CASE WHEN total > 0 THEN (succeeded::decimal / total) ELSE 0 END AS success_rate,
      COALESCE(avg_duration_ms, 0) AS avg_duration_ms,
      COALESCE(avg_attempts, 0)::float AS avg_attempts
    FROM base;
  `);

  const r =
    rows[0] ??
    {
      total: 0,
      succeeded: 0,
      failed: 0,
      success_rate: 0,
      avg_duration_ms: 0,
      avg_attempts: 0
    };

  return {
    totalJobs: Number(r.total || 0),
    succeeded: Number(r.succeeded || 0),
    failed: Number(r.failed || 0),
    successRate: Number(r.success_rate || 0),
    avgDurationMs: Number(r.avg_duration_ms || 0),
    avgAttempts: Number(r.avg_attempts || 0)
  };
};

export const getRecentJobDurations = async (limit = 50) => {
  const cappedLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const { rows } = await query(
    `
    SELECT
      job_id,
      type,
      status,
      created_at,
      started_at,
      finished_at,
      attempts,
      CASE
        WHEN finished_at IS NOT NULL AND started_at IS NOT NULL
        THEN (finished_at - started_at)
        ELSE NULL
      END AS duration_ms
    FROM video_jobs
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [cappedLimit]
  );
  return rows.map((row) => ({
    jobId: row.job_id,
    type: row.type,
    status: row.status,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    attempts: Number(row.attempts || 0),
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : null
  }));
};
