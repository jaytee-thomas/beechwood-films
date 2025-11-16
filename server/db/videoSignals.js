// server/db/videoSignals.js
import { query } from "./pool.js";

function nowMs() {
  return Date.now();
}

/**
 * Wipes existing signals for a single video so we can reinsert cleanly.
 */
async function clearSignalsForVideo(videoId) {
  await query("DELETE FROM video_signals WHERE video_id = $1", [videoId]);
  await query("DELETE FROM video_tag_signals WHERE video_id = $1", [videoId]);
  await query("DELETE FROM video_scores WHERE video_id = $1", [videoId]);
}

/**
 * Given a video row, compute simple signals from its tags.
 * - 1 signal per tag: signal_type = "tag:<tag>", score = 1
 * - 1 tag weight row per tag: weight = 1
 * - overall video_scores.score = number of tags
 */
function buildSignalsForVideo(video) {
  const createdAt = nowMs();
  const videoId = video.id;
  const tags = Array.isArray(video.tags) ? video.tags : [];

  const signalRows = [];
  const tagRows = [];
  let score = 0;

  for (const raw of tags) {
    const t = String(raw || "").trim();
    if (!t) continue;

    // tag signal
    signalRows.push({
      videoId,
      signalType: `tag:${t}`,
      score: 1,
      createdAt
    });

    // tag weight
    tagRows.push({
      videoId,
      tag: t,
      weight: 1,
      createdAt
    });

    score += 1;
  }

  return { signalRows, tagRows, score, createdAt };
}

/**
 * Bulk insert helpers that match the ACTUAL schema:
 *  - video_signals(video_id, signal_type, score, created_at)
 *  - video_tag_signals(video_id, tag, weight, created_at)
 *  - video_scores(video_id, score, created_at) with upsert
 */
async function insertSignalRows({ signalRows, tagRows, score, createdAt, videoId }) {
  // video_signals
  if (signalRows.length > 0) {
    const values = [];
    const params = [];
    let i = 1;

    for (const row of signalRows) {
      values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3})`);
      params.push(row.videoId, row.signalType, row.score, row.createdAt);
      i += 4;
    }

    await query(
      `
        INSERT INTO video_signals (video_id, signal_type, score, created_at)
        VALUES ${values.join(", ")}
      `,
      params
    );
  }

  // video_tag_signals
  if (tagRows.length > 0) {
    const values = [];
    const params = [];
    let i = 1;

    for (const row of tagRows) {
      values.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3})`);
      params.push(row.videoId, row.tag, row.weight, row.createdAt);
      i += 4;
    }

    await query(
      `
        INSERT INTO video_tag_signals (video_id, tag, weight, created_at)
        VALUES ${values.join(", ")}
      `,
      params
    );
  }

  // video_scores – keep one row per video_id
  const numericScore = Number(score) || 0;
  await query(
    `
      INSERT INTO video_scores (video_id, score, created_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (video_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        created_at = EXCLUDED.created_at
    `,
    [videoId, numericScore, createdAt]
  );
}

/**
 * Recompute signals for one video or all videos.
 * Called from the queue worker via processVideoJob().
 *
 * data: { videoId?: string }
 */
export async function recomputeVideoSignals(data = {}) {
  const { videoId } = data || {};

  if (videoId) {
    // single video
    const { rows } = await query(
      `
        SELECT id, tags
        FROM videos
        WHERE id = $1
      `,
      [videoId]
    );
    if (!rows[0]) {
      // nothing to do
      return { processed: 0 };
    }

    const video = rows[0];

    await clearSignalsForVideo(video.id);
    const built = buildSignalsForVideo(video);
    await insertSignalRows({ ...built, videoId: video.id });

    return { processed: 1, videoId: video.id };
  }

  // batch mode: all videos
  const { rows } = await query(
    `
      SELECT id, tags
      FROM videos
      WHERE published = TRUE
    `
  );

  let processed = 0;

  for (const video of rows) {
    await clearSignalsForVideo(video.id);
    const built = buildSignalsForVideo(video);
    await insertSignalRows({ ...built, videoId: video.id });
    processed += 1;
  }

  return { processed };
}

export async function getVideoSignalsForVideo(videoId) {
  if (!videoId) return null;

  const [scoreRes, signalsRes, tagsRes] = await Promise.all([
    query(
      `
        SELECT video_id, score, created_at
        FROM video_scores
        WHERE video_id = $1
      `,
      [videoId]
    ),
    query(
      `
        SELECT video_id, signal_type, score, created_at
        FROM video_signals
        WHERE video_id = $1
        ORDER BY created_at DESC
      `,
      [videoId]
    ),
    query(
      `
        SELECT video_id, tag, weight, created_at
        FROM video_tag_signals
        WHERE video_id = $1
        ORDER BY weight DESC, tag ASC
      `,
      [videoId]
    )
  ]);

  const scoreRow = scoreRes.rows[0] || null;
  const signals = signalsRes.rows || [];
  const tagSignals = tagsRes.rows || [];

  if (!scoreRow && signals.length === 0 && tagSignals.length === 0) {
    return null;
  }

  return {
    videoId,
    score: scoreRow ? Number(scoreRow.score) || 0 : 0,
    scoreCreatedAt: scoreRow ? scoreRow.created_at : null,
    signals,
    tagSignals
  };
}
