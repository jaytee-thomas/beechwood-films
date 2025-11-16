import { query } from "./pool.js";
export * from "./videos.pg.js";
export default undefined;

async function loadVideoForSignals(videoId) {
  const { rows } = await query(
    `
      SELECT id, title, tags, published, created_at
      FROM videos
      WHERE id = $1
    `,
    [videoId]
  );
  return rows[0] || null;
}

async function fallbackTopVideos(videoId, limit) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const { rows } = await query(
    `
      SELECT v.*, COALESCE(s.score, 0) AS score
      FROM videos v
      LEFT JOIN video_scores s ON s.video_id = v.id
      WHERE v.published = TRUE
        AND v.id <> $1
      ORDER BY COALESCE(s.score, 0) DESC, v.created_at DESC
      LIMIT $2
    `,
    [videoId, safeLimit]
  );
  return rows;
}

export async function getRelatedVideosFor(videoId, limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const video = await loadVideoForSignals(videoId);
  if (!video) {
    return [];
  }

  let tags = Array.isArray(video.tags) ? video.tags : [];
  tags = tags.map((t) => String(t || "").trim()).filter(Boolean);

  if (tags.length === 0) {
    return fallbackTopVideos(videoId, safeLimit);
  }

  const { rows } = await query(
    `
      SELECT
        v.*,
        COALESCE(s.score, 0) AS score,
        SUM(vts.weight) AS tag_overlap_weight,
        COUNT(*) AS tag_overlap_count
      FROM video_tag_signals vts
      JOIN videos v ON v.id = vts.video_id
      LEFT JOIN video_scores s ON s.video_id = v.id
      WHERE
        v.published = TRUE
        AND v.id <> $1
        AND vts.tag = ANY($2::text[])
      GROUP BY v.id, s.score
      ORDER BY
        tag_overlap_weight DESC,
        tag_overlap_count DESC,
        COALESCE(s.score, 0) DESC,
        v.created_at DESC
      LIMIT $3
    `,
    [videoId, tags, safeLimit]
  );

  if (!rows.length) {
    return fallbackTopVideos(videoId, safeLimit);
  }

  return rows;
}
