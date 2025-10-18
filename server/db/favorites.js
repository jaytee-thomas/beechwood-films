import db from "./client.js";
import { getVideoById } from "./videos.js";

export const listFavoriteVideos = (userId) => {
  const rows = db
    .prepare(
      `SELECT v.*
       FROM favorites f
       JOIN videos v ON v.id = f.video_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(userId);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    embedUrl: row.embed_url,
    src: row.src,
    provider: row.provider,
    providerId: row.provider_id,
    thumbnail: row.thumbnail,
    library: row.library,
    source: row.source,
    duration: row.duration,
    date: row.date,
    description: row.description,
    tags: (() => {
      try {
        return row.tags ? JSON.parse(row.tags) : [];
      } catch {
        return [];
      }
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by
  }));
};

export const listFavoriteIds = (userId) => {
  const rows = db
    .prepare("SELECT video_id FROM favorites WHERE user_id = ?")
    .all(userId);
  return rows.map((row) => Number(row.video_id));
};

export const addFavorite = (userId, videoId) => {
  const video = getVideoById(videoId);
  if (!video) return null;
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO favorites (user_id, video_id, created_at)
     VALUES (?, ?, ?)`
  ).run(userId, videoId, now);
  return video;
};

export const removeFavorite = (userId, videoId) => {
  const info = db
    .prepare(
      `DELETE FROM favorites
       WHERE user_id = ? AND video_id = ?`
    )
    .run(userId, videoId);
  return info.changes > 0;
};

