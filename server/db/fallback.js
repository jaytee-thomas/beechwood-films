import db from "./client.js";
import { serializeTags } from "./videos.js";

const columns = [
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

export const saveFallbackVideos = (videos = []) => {
  db.prepare("DELETE FROM fallback_videos").run();
  if (!Array.isArray(videos) || videos.length === 0) return;

  const insert = db.prepare(
    `INSERT INTO fallback_videos (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`
  );

  const toRow = (video) => [
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

  const insertMany = db.transaction((items) => {
    items.forEach((video) => insert.run(...toRow(video)));
  });

  insertMany(videos);
};

export const getFallbackVideos = () => {
  return db.prepare(`SELECT rowid as position, ${columns.join(", ")} FROM fallback_videos ORDER BY position ASC`).all();
};

export const seedVideosFromFallback = () => {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM videos").get();
  if (countRow.count > 0) return;

  const fallback = getFallbackVideos();
  if (!fallback.length) return;

  const insert = db.prepare(
    `INSERT INTO videos (
      title, embed_url, src, provider, provider_id, thumbnail, library,
      source, duration, date, description, tags, created_at, updated_at, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`
  );

  const now = Date.now();
  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => {
      insert.run(
        row.title,
        row.embed_url,
        row.src,
        row.provider,
        row.provider_id,
        row.thumbnail,
        row.library,
        row.source || "fallback",
        row.duration,
        row.date,
        row.description,
        row.tags,
        now,
        now
      );
    });
  });

  insertMany(fallback);
};
