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
  const videoId = data?.videoId ? String(data.videoId).trim() : "";

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

// ======================================================================
// Read helpers for API
// ======================================================================

function normalizeId(maybeId) {
  const v = String(maybeId ?? "").trim();
  if (!v || v === "null" || v === "undefined") return null;
  return v;
}

/**
 * Return signals + tag weights + score for a single video.
 */
export async function getVideoSignalsForVideo(videoIdInput) {
  const videoId = normalizeId(videoIdInput);
  if (!videoId) return null;

  const [signalsRes, tagsRes, scoreRes] = await Promise.all([
    query(
      `
        SELECT signal_type, score, created_at
        FROM video_signals
        WHERE video_id = $1
        ORDER BY created_at DESC, signal_type ASC
      `,
      [videoId]
    ),
    query(
      `
        SELECT tag, weight, created_at
        FROM video_tag_signals
        WHERE video_id = $1
        ORDER BY weight DESC, tag ASC
      `,
      [videoId]
    ),
    query(
      `
        SELECT score, created_at
        FROM video_scores
        WHERE video_id = $1
        LIMIT 1
      `,
      [videoId]
    )
  ]);

  const scoreRow = scoreRes.rows[0] || null;

  // If nothing at all, let the route 404
  if (!signalsRes.rows.length && !tagsRes.rows.length && !scoreRow) {
    return null;
  }

  return {
    videoId,
    score: scoreRow ? scoreRow.score : 0,
    scoreCreatedAt: scoreRow ? scoreRow.created_at : null,
    signals: signalsRes.rows.map((r) => ({
      type: r.signal_type,
      score: r.score,
      createdAt: r.created_at
    })),
    tags: tagsRes.rows.map((r) => ({
      tag: r.tag,
      weight: r.weight,
      createdAt: r.created_at
    }))
  };
}

/**
 * Very simple "related videos" based on overlapping tags.
 */
export async function getRelatedVideosForVideo(videoIdInput, { limit = 8 } = {}) {
  const videoId = normalizeId(videoIdInput);
  if (!videoId) return [];

  const { rows } = await query(
    `
      SELECT
        v.id,
        v.title,
        COALESCE(vs.score, 0) AS score,
        COUNT(DISTINCT t2.tag) AS overlap_tags,
        MAX(v.created_at) AS created_at
      FROM video_tag_signals t1
      JOIN video_tag_signals t2
        ON t1.tag = t2.tag
      JOIN videos v
        ON v.id = t2.video_id
      LEFT JOIN video_scores vs
        ON vs.video_id = v.id
      WHERE t1.video_id = $1
        AND t2.video_id <> $1
      GROUP BY v.id, v.title, vs.score
      ORDER BY overlap_tags DESC, score DESC, created_at DESC
      LIMIT $2
    `,
    [videoId, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    score: Number(r.score) || 0,
    overlapTags: Number(r.overlap_tags) || 0
  }));
}
