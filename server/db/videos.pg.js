import { query } from "./pool.js";

const videoColumns = [
  "id",
  "title",
  "embed_url",
  "src",
  "provider",
  "provider_id",
  "thumbnail_url",
  "library",
  "source",
  "duration",
  "duration_seconds",
  "date",
  "description",
  "tags",
  "published",
  "status",
  "preview_src",
  "file_name",
  "size_bytes",
  "width",
  "height",
  "s3_key",
  "r2_key",
  "created_at",
  "updated_at"
];

const selectColumns = videoColumns.join(", ");

const toNullableNumber = (value) => {
  if (value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const parseTags = (value) => {
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

export const serializeTags = (value) => JSON.stringify(parseTags(value));

const toVideo = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    embedUrl: row.embed_url,
    src: row.src ?? row.embed_url,
    provider: row.provider,
    providerId: row.provider_id,
    thumbnail: row.thumbnail_url ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    library: row.library,
    source: row.source,
    duration: row.duration,
    durationSeconds: toNullableNumber(row.duration_seconds),
    date: row.date,
    description: row.description,
    tags: parseTags(row.tags),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    previewSrc: row.preview_src,
    fileName: row.file_name,
    sizeBytes: toNullableNumber(row.size_bytes),
    width: toNullableNumber(row.width),
    height: toNullableNumber(row.height),
    status: row.status,
    published: row.published,
    s3Key: row.s3_key,
    r2Key: row.r2_key
  };
};

export const listVideos = async () => {
  const { rows } = await query(
    `SELECT ${selectColumns}
       FROM videos
      ORDER BY created_at ASC`
  );
  return rows.map(toVideo);
};

export const getVideoById = async (id) => {
  if (!id) return null;
  const { rows } = await query(
    `SELECT ${selectColumns}
       FROM videos
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return toVideo(rows[0]);
};

export const insertVideo = async (data = {}, authorId) => {
  const now = Date.now();
  const embedUrl = data.embedUrl || data.src || "";
  const src = data.src || embedUrl;
  const provider = data.provider ?? null;
  const providerId = data.providerId ?? null;
  const createdAt = data.createdAt ?? now;
  const updatedAt = data.updatedAt ?? now;
  const thumbnailUrl = data.thumbnailUrl ?? data.thumbnail ?? null;
  const durationSeconds = toNullableNumber(
    data.durationSeconds ?? data.duration_seconds
  );
  const sizeBytes = toNullableNumber(data.sizeBytes);
  const width = toNullableNumber(data.width);
  const height = toNullableNumber(data.height);

  const { rows } = await query(
    `INSERT INTO videos (
       title, embed_url, src, provider, provider_id,
       thumbnail_url, library, source, duration, duration_seconds,
       date, description, tags, published, status,
       preview_src, file_name, size_bytes, width, height,
       s3_key, r2_key, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $13::jsonb, $14, $15,
       $16, $17, $18, $19, $20,
       $21, $22, $23, $24
     )
     RETURNING ${selectColumns}`,
    [
      data.title,
      embedUrl,
      src,
      provider,
      providerId,
      thumbnailUrl,
      data.library ?? null,
      data.source ?? "api",
      data.duration ?? null,
      durationSeconds,
      data.date ?? null,
      data.description ?? null,
      serializeTags(data.tags),
      data.published ?? false,
      data.status ?? "draft",
      data.previewSrc ?? null,
      data.fileName ?? null,
      sizeBytes,
      width,
      height,
      data.s3Key ?? null,
      data.r2Key ?? null,
      createdAt,
      updatedAt
    ]
  );

  return toVideo(rows[0]);
};

export const updateVideo = async (id, updates = {}, authorId) => {
  const current = await getVideoById(id);
  if (!current) return null;

  const now = Date.now();
  const next = {
    title: updates.title ?? current.title,
    embedUrl: updates.embedUrl ?? updates.src ?? current.embedUrl,
    src: updates.src ?? updates.embedUrl ?? current.src,
    provider: updates.provider ?? current.provider,
    providerId: updates.providerId ?? current.providerId,
    thumbnailUrl: updates.thumbnailUrl ?? updates.thumbnail ?? current.thumbnail,
    library: updates.library ?? current.library,
    source: updates.source ?? current.source,
    duration: updates.duration ?? current.duration,
    durationSeconds: toNullableNumber(
      updates.durationSeconds ?? current.durationSeconds
    ),
    date: updates.date ?? current.date,
    description: updates.description ?? current.description,
    tags: updates.tags !== undefined ? updates.tags : current.tags,
    previewSrc: updates.previewSrc ?? current.previewSrc,
    fileName: updates.fileName ?? current.fileName,
    sizeBytes: toNullableNumber(updates.sizeBytes ?? current.sizeBytes),
    width: toNullableNumber(updates.width ?? current.width),
    height: toNullableNumber(updates.height ?? current.height),
    status: updates.status ?? current.status ?? "draft",
    published: updates.published ?? current.published ?? false,
    s3Key: updates.s3Key ?? current.s3Key ?? null,
    r2Key: updates.r2Key ?? current.r2Key ?? null
  };

  const { rows } = await query(
    `UPDATE videos
        SET title = $1,
            embed_url = $2,
            src = $3,
            provider = $4,
            provider_id = $5,
            thumbnail_url = $6,
            library = $7,
            source = $8,
            duration = $9,
            duration_seconds = $10,
            date = $11,
            description = $12,
            tags = $13::jsonb,
            published = $14,
            status = $15,
            preview_src = $16,
            file_name = $17,
            size_bytes = $18,
            width = $19,
            height = $20,
            s3_key = $21,
            r2_key = $22,
            updated_at = $23
      WHERE id = $24
      RETURNING ${selectColumns}`,
    [
      next.title,
      next.embedUrl,
      next.src,
      next.provider,
      next.providerId,
      next.thumbnailUrl,
      next.library,
      next.source,
      next.duration,
      next.durationSeconds,
      next.date,
      next.description,
      serializeTags(next.tags),
      next.published,
      next.status,
      next.previewSrc,
      next.fileName,
      next.sizeBytes,
      next.width,
      next.height,
      next.s3Key,
      next.r2Key,
      now,
      id
    ]
  );

  return toVideo(rows[0]);
};

export const deleteVideo = async (id) => {
  const { rowCount } = await query(
    "DELETE FROM videos WHERE id = $1",
    [id]
  );
  if (rowCount) {
    await query("DELETE FROM favorites WHERE video_id = $1", [id]);
  }
  return rowCount > 0;
};
