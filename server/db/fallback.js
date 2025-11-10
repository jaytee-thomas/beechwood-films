import { query, withTransaction } from "./pool.js";

const columns = [
  "position",
  "title",
  "embed_url",
  "src",
  "provider",
  "provider_id",
  "thumbnail",
  "library",
  "source",
  "duration",
  "date",
  "description",
  "tags",
  "file_name"
];

const insertSql = `
  INSERT INTO fallback_videos (
    position,
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
    file_name
  ) VALUES (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14
  )
`;

const selectColumns = columns.join(", ");

const normalizeTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const serializeTags = (value) => JSON.stringify(normalizeTags(value));

const toRow = (video = {}, index = 0) => [
  index + 1,
  video.title || "Untitled",
  video.embedUrl || video.src || "",
  video.src || video.embedUrl || "",
  video.provider || null,
  video.providerId || null,
  video.thumbnail || null,
  video.library || null,
  video.source || "fallback",
  video.duration || null,
  video.date || null,
  video.description || null,
  serializeTags(video.tags),
  video.fileName || null
];

export const saveFallbackVideos = async (videos = []) => {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM fallback_videos");
    if (!Array.isArray(videos) || videos.length === 0) return;
    for (let idx = 0; idx < videos.length; idx += 1) {
      await client.query(insertSql, toRow(videos[idx], idx));
    }
  });
};

export const getFallbackVideos = async () => {
  const { rows } = await query(
    `SELECT ${selectColumns}
       FROM fallback_videos
      ORDER BY position ASC`
  );
  return rows.map((row) => ({
    ...row,
    tags: normalizeTags(row.tags)
  }));
};

export const seedVideosFromFallback = async () => {
  const fallback = await getFallbackVideos();
  if (!fallback.length) {
    console.log("[fallback] no fallback data available");
    return [];
  }
  console.log("[fallback] loaded", fallback.length, "snapshot entries");
  return fallback;
};
