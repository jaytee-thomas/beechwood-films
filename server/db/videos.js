import db from "./client.js";

const parseTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const serializeTags = (value) => {
  if (!value) return JSON.stringify([]);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") {
    return JSON.stringify(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    );
  }
  return JSON.stringify([]);
};

const toVideo = (row) => {
  if (!row) return null;
  return {
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
    tags: parseTags(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by
  };
};

export const listVideos = () => {
  const rows = db
    .prepare(
      `SELECT *
       FROM videos
       ORDER BY created_at ASC`
    )
    .all();
  return rows.map(toVideo);
};

export const insertVideo = (data, authorId) => {
  const now = Date.now();
  const result = db.prepare(
    `INSERT INTO videos (
      title, embed_url, src, provider, provider_id,
      thumbnail, library, source, duration, date,
      description, tags, created_at, updated_at, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.title,
    data.embedUrl,
    data.src ?? data.embedUrl,
    data.provider ?? null,
    data.providerId ?? null,
    data.thumbnail ?? null,
    data.library ?? null,
    data.source ?? "api",
    data.duration ?? null,
    data.date ?? null,
    data.description ?? null,
    serializeTags(data.tags),
    now,
    now,
    authorId ?? null,
    authorId ?? null
  );

  return getVideoById(result.lastInsertRowid);
};

export const getVideoById = (id) => {
  const row = db.prepare("SELECT * FROM videos WHERE id = ?").get(id);
  return toVideo(row);
};

export const updateVideo = (id, data, authorId) => {
  const current = getVideoById(id);
  if (!current) return null;

  const updatedTags =
    data.tags !== undefined ? serializeTags(data.tags) : serializeTags(current.tags);

  db.prepare(
    `UPDATE videos
     SET title = ?, embed_url = ?, src = ?, provider = ?, provider_id = ?,
         thumbnail = ?, library = ?, source = ?, duration = ?, date = ?,
         description = ?, tags = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  ).run(
    data.title ?? current.title,
    data.embedUrl ?? current.embedUrl,
    data.src ?? data.embedUrl ?? current.src ?? current.embedUrl,
    data.provider ?? current.provider,
    data.providerId ?? current.providerId,
    data.thumbnail ?? current.thumbnail,
    data.library ?? current.library,
    data.source ?? current.source,
    data.duration ?? current.duration,
    data.date ?? current.date,
    data.description ?? current.description,
    updatedTags,
    Date.now(),
    authorId ?? current.updatedBy ?? current.createdBy ?? null,
    id
  );

  return getVideoById(id);
};

export const deleteVideo = (id) => {
  const info = db.prepare("DELETE FROM videos WHERE id = ?").run(id);
  if (info.changes) {
    db.prepare("DELETE FROM favorites WHERE video_id = ?").run(id);
  }
  return info.changes > 0;
};

