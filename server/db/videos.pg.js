import { query } from "./pool.js";

const nowMs = () => Date.now();

const normalizeTags = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return normalizeTags(parsed);
    } catch {
      // fall through to comma parsing
    }
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof input === "object") {
    return normalizeTags(Object.values(input));
  }
  return [];
};

const toJsonbArrayString = (tags) => JSON.stringify(normalizeTags(tags));

const toIntOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const parseRowTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return normalizeTags(value);
    }
  }
  return normalizeTags(value);
};

const columns = [
  "id",
  "title",
  "embed_url",
  "src",
  "provider",
  "provider_id",
  "library",
  "source",
  "duration",
  "date",
  "description",
  "s3_key",
  "thumbnail_url",
  "duration_seconds",
  "published",
  "created_at",
  "updated_at",
  "file_name",
  "size_bytes",
  "width",
  "height",
  "status",
  "r2_key",
  "preview_src",
  "tags"
].join(", ");

const baseSelect = `SELECT ${columns} FROM videos`;

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  embedUrl: row.embed_url,
  src: row.src ?? row.embed_url,
  provider: row.provider ?? "custom",
  providerId: row.provider_id ?? null,
  thumbnail: row.thumbnail_url ?? null,
  thumbnailUrl: row.thumbnail_url ?? null,
  library: row.library ?? null,
  source: row.source ?? null,
  duration: row.duration ?? null,
  durationSeconds: toIntOrNull(row.duration_seconds),
  date: row.date ?? null,
  description: row.description ?? null,
  tags: parseRowTags(row.tags),
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
  previewSrc: row.preview_src ?? null,
  fileName: row.file_name ?? null,
  sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
  width: toIntOrNull(row.width),
  height: toIntOrNull(row.height),
  status: row.status ?? "draft",
  published: row.published ?? false,
  s3Key: row.s3_key ?? null,
  r2Key: row.r2_key ?? null
});

export const listVideos = async ({ page = 1, pageSize = 20 } = {}) => {
  const limit = Math.max(1, Math.min(Number(pageSize) || 20, 100));
  const safePage = Math.max(1, Number(page) || 1);
  const offset = (safePage - 1) * limit;

  const { rows } = await query(
    `${baseSelect}
     ORDER BY published DESC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    items: rows.map(mapRow),
    page: safePage,
    pageSize: limit
  };
};

export const getVideoById = async (id) => {
  const { rows } = await query(
    `${baseSelect}
     WHERE id = $1::uuid`,
    [id]
  );
  if (!rows.length) return null;
  return mapRow(rows[0]);
};

export const insertVideo = async (payload = {}) => {
  const createdAt = nowMs();
  const updatedAt = createdAt;
  const title = String(payload.title || "").trim();
  if (!title) {
    const error = new Error("title is required");
    error.status = 400;
    throw error;
  }

  const embedUrl = String(payload.embedUrl || payload.src || "").trim();
  if (!embedUrl) {
    const error = new Error("embedUrl is required");
    error.status = 400;
    throw error;
  }

  const src = payload.src ? String(payload.src).trim() : embedUrl;
  const published = payload.published === false ? false : true;
  const status = String(payload.status || "draft");
  const durationSeconds = toIntOrNull(payload.durationSeconds);
  const sizeBytes = payload.sizeBytes == null ? null : Number(payload.sizeBytes);
  const width = toIntOrNull(payload.width);
  const height = toIntOrNull(payload.height);
  const tagsJson = toJsonbArrayString(payload.tags);

  const { rows } = await query(
    `INSERT INTO videos (
       title, embed_url, src, provider, provider_id,
       library, source, duration, date, description,
       s3_key, thumbnail_url, duration_seconds, published,
       created_at, updated_at, file_name, size_bytes, width, height,
       status, r2_key, preview_src, tags
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10,
       $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20,
       $21, $22, $23, $24::jsonb
     )
     RETURNING ${columns}`,
    [
      title,
      embedUrl,
      src,
      payload.provider ?? "custom",
      payload.providerId ?? null,
      payload.library ?? null,
      payload.source ?? "api",
      payload.duration ?? null,
      payload.date ?? null,
      payload.description ?? null,
      payload.s3Key ?? null,
      payload.thumbnailUrl ?? payload.thumbnail ?? null,
      durationSeconds,
      published,
      createdAt,
      updatedAt,
      payload.fileName ?? null,
      sizeBytes,
      width,
      height,
      status,
      payload.r2Key ?? null,
      payload.previewSrc ?? null,
      tagsJson
    ]
  );

  return mapRow(rows[0]);
};

export const updateVideo = async (id, updates = {}) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const set = (column, value, cast = "") => {
    fields.push(`${column} = $${idx}${cast}`);
    values.push(value);
    idx += 1;
  };

  if (updates.title !== undefined) {
    set("title", String(updates.title || "").trim());
  }
  if (updates.embedUrl !== undefined || updates.src !== undefined) {
    const nextEmbed = updates.embedUrl ?? updates.src;
    const trimmed = String(nextEmbed || "").trim();
    if (!trimmed) {
      const error = new Error("embedUrl cannot be empty");
      error.status = 400;
      throw error;
    }
    set("embed_url", trimmed);
  }
  if (updates.src !== undefined) {
    const nextSrc = updates.src;
    set("src", nextSrc == null ? null : String(nextSrc).trim());
  }
  if (updates.description !== undefined) set("description", updates.description ?? null);
  if (updates.s3Key !== undefined) set("s3_key", updates.s3Key ?? null);
  if (updates.thumbnailUrl !== undefined || updates.thumbnail !== undefined) {
    set("thumbnail_url", updates.thumbnailUrl ?? updates.thumbnail ?? null);
  }
  if (updates.providerId !== undefined) set("provider_id", updates.providerId ?? null);
  if (updates.library !== undefined) set("library", updates.library ?? null);
  if (updates.source !== undefined) set("source", updates.source ?? null);
  if (updates.duration !== undefined) set("duration", updates.duration ?? null);
  if (updates.date !== undefined) set("date", updates.date ?? null);
  if (updates.durationSeconds !== undefined) {
    set("duration_seconds", toIntOrNull(updates.durationSeconds));
  }
  if (updates.published !== undefined) set("published", !!updates.published);
  if (updates.fileName !== undefined) set("file_name", updates.fileName ?? null);
  if (updates.sizeBytes !== undefined) {
    set("size_bytes", updates.sizeBytes == null ? null : Number(updates.sizeBytes));
  }
  if (updates.width !== undefined) set("width", toIntOrNull(updates.width));
  if (updates.height !== undefined) set("height", toIntOrNull(updates.height));
  if (updates.status !== undefined) set("status", String(updates.status || "draft"));
  if (updates.provider !== undefined) set("provider", updates.provider ?? "custom");
  if (updates.r2Key !== undefined) set("r2_key", updates.r2Key ?? null);
  if (updates.previewSrc !== undefined) set("preview_src", updates.previewSrc ?? null);
  if (updates.tags !== undefined) set("tags", toJsonbArrayString(updates.tags), "::jsonb");

  set("updated_at", nowMs());

  if (!fields.length) {
    const current = await getVideoById(id);
    if (!current) {
      const error = new Error("Video not found");
      error.status = 404;
      throw error;
    }
    return current;
  }

  values.push(id);

  const { rows } = await query(
    `UPDATE videos
        SET ${fields.join(", ")}
      WHERE id = $${idx}::uuid
      RETURNING ${columns}`,
    values
  );

  if (!rows.length) {
    const error = new Error("Video not found");
    error.status = 404;
    throw error;
  }

  return mapRow(rows[0]);
};

export const deleteVideo = async (id) => {
  const { rowCount } = await query(
    "DELETE FROM videos WHERE id = $1::uuid",
    [id]
  );
  return rowCount > 0;
};
