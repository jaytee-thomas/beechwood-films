// server/db/videoSignals.js
import { query } from "./pool.js";

/**
 * Wipe all signals/score rows for a given video.
 */
export async function deleteSignalsForVideo(videoId) {
  if (!videoId) return;
  await Promise.all([
    query(`DELETE FROM video_signals WHERE video_id = $1`, [videoId]),
    query(`DELETE FROM video_scores WHERE video_id = $1`, [videoId]),
    query(`DELETE FROM video_tag_signals WHERE video_id = $1`, [videoId])
  ]);
}

/**
 * Bulk insert raw signals into video_signals.
 * signals: [ { signalType, score } ]
 */
export async function insertVideoSignals(videoId, signals = []) {
  if (!videoId || !Array.isArray(signals) || signals.length === 0) return;

  const rows = signals
    .map((s) => ({
      kind: s?.signalType ?? s?.kind ?? s?.type ?? null,
      weight: Number.isFinite(s?.score) ? Number(s.score) : Number(s?.weight) || 0,
      meta: s?.meta ?? {}
    }))
    .filter((row) => row.kind);

  if (!rows.length) return;

  const now = Date.now();
  const values = [];
  const params = [];

  rows.forEach((row, idx) => {
    const base = idx * 5;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    params.push(videoId, row.kind, row.weight, row.meta, now);
  });

  const sql = `
    INSERT INTO video_signals (video_id, kind, weight, meta, created_at)
    VALUES ${values.join(", ")}
  `;

  await query(sql, params);
}

/**
 * Bulk insert per-tag weights into video_tag_signals.
 * tagSignals: [ { tag, weight } ]
 */
export async function insertVideoTagSignals(videoId, tagSignals = []) {
  if (!videoId || !Array.isArray(tagSignals) || tagSignals.length === 0) return;

  const now = Date.now();
  const values = [];
  const params = [];

  tagSignals.forEach((t, idx) => {
    const base = idx * 4;
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
    );
    params.push(
      videoId,
      t.tag,
      Number.isFinite(t.weight) ? t.weight : 1,
      now
    );
  });

  const sql = `
    INSERT INTO video_tag_signals (video_id, tag, weight, created_at)
    VALUES ${values.join(", ")}
  `;

  await query(sql, params);
}

/**
 * Upsert the main score per video into video_scores.
 */
export async function upsertVideoScore(videoId, score) {
  if (!videoId) return;

  const now = Date.now();
  const numericScore = Number.isFinite(score) ? score : 0;

  await query(
    `
    INSERT INTO video_scores (video_id, score, last_recomputed_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (video_id)
    DO UPDATE SET
      score = EXCLUDED.score,
      last_recomputed_at = EXCLUDED.last_recomputed_at
    `,
    [videoId, numericScore, now]
  );
}
