// server/db/videoSignals.js
import { query } from "./pool.js";

function nowMs() {
  return Date.now();
}

const TAG_WEIGHTS = {
  featured: 5,
  reel: 3,
  beechwood: 2
};

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
    const key = t.toLowerCase();
    const weight = TAG_WEIGHTS[key] ?? 1;

    // tag signal
    signalRows.push({
      videoId,
      signalType: `tag:${t}`,
      score: weight,
      createdAt
    });

    // tag weight
    tagRows.push({
      videoId,
      tag: t,
      weight,
      createdAt
    });

    score += weight;
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
  console.log("[signals] recomputeVideoSignals called with:", data);
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

    console.log("[signals] recomputeVideoSignals done – processed = 1 (single)");
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

  console.log("[signals] recomputeVideoSignals done – processed =", processed);
  return { processed };
}

export async function getSignalsForVideo(videoId) {
  const { rows: scoreRows } = await query(
    `
      SELECT video_id, score, created_at
      FROM video_scores
      WHERE video_id = $1
    `,
    [videoId]
  );

  const baseScore = scoreRows[0] || null;

  const { rows: signalRows } = await query(
    `
      SELECT video_id, signal_type, score, created_at
      FROM video_signals
      WHERE video_id = $1
      ORDER BY created_at DESC
    `,
    [videoId]
  );

  const { rows: tagRows } = await query(
    `
      SELECT video_id, tag, weight, created_at
      FROM video_tag_signals
      WHERE video_id = $1
      ORDER BY created_at DESC
    `,
    [videoId]
  );

  return {
    score: baseScore
      ? {
          videoId: baseScore.video_id,
          score: Number(baseScore.score) || 0,
          createdAt: baseScore.created_at
        }
      : null,
    signals: signalRows.map((r) => ({
      videoId: r.video_id,
      type: r.signal_type,
      score: Number(r.score) || 0,
      createdAt: r.created_at
    })),
    tagSignals: tagRows.map((r) => ({
      videoId: r.video_id,
      tag: r.tag,
      weight: Number(r.weight) || 0,
      createdAt: r.created_at
    }))
  };
}

export async function getRelatedVideos(videoId, { limit = 6 } = {}) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 6));
  const { rows } = await query(
    `
      WITH target_tags AS (
        SELECT tag, weight
        FROM video_tag_signals
        WHERE video_id = $1
      )
      SELECT
        v.id,
        v.title,
        v.embed_url,
        v.src,
        v.provider,
        v.provider_id,
        v.thumbnail,
        v.library,
        v.source,
        v.duration,
        v.date,
        v.description,
        v.tags,
        v.created_at,
        v.updated_at,
        v.file_name,
        v.size_bytes,
        v.width,
        v.height,
        v.status,
        v.published,
        v.preview_src,
        v.s3_key,
        v.r2_key,
        COALESCE(SUM(t.weight), 0) AS related_score
      FROM target_tags t
      JOIN video_tag_signals vts
        ON vts.tag = t.tag
      JOIN videos v
        ON v.id = vts.video_id
      WHERE v.id <> $1
        AND v.published = TRUE
      GROUP BY
        v.id, v.title, v.embed_url, v.src,
        v.provider, v.provider_id,
        v.thumbnail, v.library, v.source,
        v.duration, v.date, v.description,
        v.tags, v.created_at, v.updated_at,
        v.file_name, v.size_bytes, v.width, v.height,
        v.status, v.published, v.preview_src,
        v.s3_key, v.r2_key
      ORDER BY related_score DESC, v.created_at DESC
      LIMIT $2
    `,
    [videoId, safeLimit]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    embedUrl: r.embed_url ?? null,
    src: r.src ?? null,
    provider: r.provider ?? "custom",
    providerId: r.provider_id ?? null,
    thumbnail: r.thumbnail ?? null,
    library: r.library ?? null,
    source: r.source ?? null,
    duration: r.duration ?? null,
    description: r.description ?? null,
    tags: Array.isArray(r.tags) ? r.tags : [],
    createdAt: r.created_at ?? null,
    relatedScore: Number(r.related_score) || 0
  }));
}

// ======================================================================
// Read helpers for API
// ======================================================================

export async function getVideoSignalsForVideo(videoId) {
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

  if (!signalsRes.rows.length && !tagsRes.rows.length && !scoreRow) {
    return null;
  }

  return {
    videoId,
    score: scoreRow ? Number(scoreRow.score) || 0 : 0,
    scoreCreatedAt: scoreRow ? scoreRow.created_at : null,
    signals: signalsRes.rows.map((r) => ({
      type: r.signal_type,
      score: Number(r.score) || 0,
      createdAt: r.created_at
    })),
    tags: tagsRes.rows.map((r) => ({
      tag: r.tag,
      weight: Number(r.weight) || 0,
      createdAt: r.created_at
    }))
  };
}

export async function getRelatedVideosForVideo(videoId, { limit = 8 } = {}) {
  if (!videoId) return [];
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 8));

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
    [videoId, safeLimit]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    score: Number(r.score) || 0,
    overlapTags: Number(r.overlap_tags) || 0
  }));
}
