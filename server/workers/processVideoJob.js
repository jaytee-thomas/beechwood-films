import { query } from "../db/pool.js";

const toIntOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const recomputeForVideoId = async (videoId, { onProgress } = {}) => {
  if (!videoId) return { ok: true, updated: 0 };

  onProgress?.(0.1);
  const { rows } = await query(
    `
    SELECT
      id,
      title,
      embed_url,
      src,
      provider,
      provider_id,
      thumbnail,
      library,
      source,
      duration,
      date,
      description,
      tags,
      created_at,
      updated_at,
      file_name,
      size_bytes,
      width,
      height,
      status,
      published,
      preview_src,
      s3_key,
      r2_key
    FROM videos
    WHERE id = $1
    `,
    [videoId]
  );
  const current = rows[0];
  if (!current) {
    return { ok: true, updated: 0, note: "video not found" };
  }

  onProgress?.(0.4);
  const normalized = {
    src: current.src || current.embed_url || null,
    duration: current.duration ?? null,
    width: toIntOrNull(current.width),
    height: toIntOrNull(current.height)
  };

  const updates = [];
  const values = [];
  const add = (sql, value) => {
    updates.push(sql.replace("?", `$${values.length + 1}`));
    values.push(value);
  };

  add("src = COALESCE(?, src)", normalized.src);
  add("duration = COALESCE(?, duration)", normalized.duration);
  add("width = COALESCE(?, width)", normalized.width);
  add("height = COALESCE(?, height)", normalized.height);
  add("updated_at = ?", Date.now());
  values.push(videoId);

  onProgress?.(0.7);
  const { rowCount } = await query(
    `UPDATE videos SET ${updates.join(", ")} WHERE id = $${values.length}`,
    values
  );

  onProgress?.(0.9);
  return { ok: true, updated: rowCount };
};

export const processVideoJob = async (job, { onProgress } = {}) => {
  const type = job?.name || "recomputeVideoSignals";
  const { videoId = null } = job?.data || {};

  switch (type) {
    case "recomputeVideoSignals":
      return recomputeForVideoId(videoId, { onProgress });
    default:
      return { ok: true, updated: 0, note: `unknown type: ${type}` };
  }
};
