import { query } from "./pool.js";

const videoColumns = [
  "id",
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
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "preview_src",
  "file_name",
  "size_bytes",
  "width",
  "height",
  "status",
  "published",
  "s3_key",
  "r2_key"
];

const selectColumns = videoColumns.join(", ");

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
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    previewSrc: row.preview_src,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
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
  const createdBy = authorId ?? data.createdBy ?? null;
  const createdAt = data.createdAt ?? now;
  const updatedAt = data.updatedAt ?? now;

  const { rows } = await query(
    `INSERT INTO videos (
       title, embed_url, src, provider, provider_id,
       thumbnail, library, source, duration, date,
       description, tags, created_at, updated_at,
       created_by, updated_by,
       preview_src, file_name, size_bytes, width, height,
       status, published, s3_key, r2_key
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12::jsonb, $13, $14,
       $15, $16,
       $17, $18, $19, $20, $21,
       $22, $23, $24, $25
     )
     RETURNING ${selectColumns}`,
    [
      data.title,
      embedUrl,
      src,
      provider,
      providerId,
      data.thumbnail ?? null,
      data.library ?? null,
      data.source ?? "api",
      data.duration ?? null,
      data.date ?? null,
      data.description ?? null,
      serializeTags(data.tags),
      createdAt,
      updatedAt,
      createdBy,
      createdBy,
      data.previewSrc ?? null,
      data.fileName ?? null,
      data.sizeBytes ?? null,
      data.width ?? null,
      data.height ?? null,
      data.status ?? "draft",
      data.published ?? false,
      data.s3Key ?? null,
      data.r2Key ?? null
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
    thumbnail: updates.thumbnail ?? current.thumbnail,
    library: updates.library ?? current.library,
    source: updates.source ?? current.source,
    duration: updates.duration ?? current.duration,
    date: updates.date ?? current.date,
    description: updates.description ?? current.description,
    tags: updates.tags !== undefined ? updates.tags : current.tags,
    previewSrc: updates.previewSrc ?? current.previewSrc,
    fileName: updates.fileName ?? current.fileName,
    sizeBytes: updates.sizeBytes ?? current.sizeBytes ?? null,
    width: updates.width ?? current.width ?? null,
    height: updates.height ?? current.height ?? null,
    status: updates.status ?? current.status ?? "draft",
    published: updates.published ?? current.published ?? false,
    s3Key: updates.s3Key ?? current.s3Key ?? null,
    r2Key: updates.r2Key ?? current.r2Key ?? null,
    updatedBy: authorId ?? current.updatedBy ?? current.createdBy ?? null
  };

  const { rows } = await query(
    `UPDATE videos
        SET title = $1,
            embed_url = $2,
            src = $3,
            provider = $4,
            provider_id = $5,
            thumbnail = $6,
            library = $7,
            source = $8,
            duration = $9,
            date = $10,
            description = $11,
            tags = $12::jsonb,
            updated_at = $13,
            updated_by = $14,
            preview_src = $15,
            file_name = $16,
            size_bytes = $17,
            width = $18,
            height = $19,
            status = $20,
            published = $21,
            s3_key = $22,
            r2_key = $23
      WHERE id = $24
      RETURNING ${selectColumns}`,
    [
      next.title,
      next.embedUrl,
      next.src,
      next.provider,
      next.providerId,
      next.thumbnail,
      next.library,
      next.source,
      next.duration,
      next.date,
      next.description,
      serializeTags(next.tags),
      now,
      next.updatedBy,
      next.previewSrc,
      next.fileName,
      next.sizeBytes,
      next.width,
      next.height,
      next.status,
      next.published,
      next.s3Key,
      next.r2Key,
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
