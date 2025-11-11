import { query } from "./pool.js";

/** Normalize incoming tags to a JSON array string (for ::jsonb cast). */
function serializeTags(tags) {
  if (tags == null) return "[]";
  if (Array.isArray(tags)) return JSON.stringify(tags);
  // allow comma-delimited
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? JSON.stringify(parsed) : "[]";
    } catch {
      return JSON.stringify(
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      );
    }
  }
  return "[]";
}

/** Coerce duration text to number (seconds) if numeric, else null. */
function toNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** DB row -> API shape */
function mapRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    // expose both embedUrl and src like legacy API
    embedUrl: r.embed_url ?? null,
    src: r.src ?? null,

    provider: r.provider ?? "custom",
    providerId: r.provider_id ?? null,

    // legacy & alt naming for thumbnail
    thumbnail: r.thumbnail ?? null,
    thumbnailUrl: r.thumbnail ?? null,

    library: r.library ?? null,
    source: r.source ?? null,

    // duration persisted as TEXT (schema), also expose numeric if possible
    duration: r.duration ?? null,
    durationSeconds: toNumberOrNull(r.duration),

    date: r.date ?? null,
    description: r.description ?? null,

    tags: Array.isArray(r.tags) ? r.tags : [],

    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,

    // upload / file metadata (nullable)
    previewSrc: r.preview_src ?? null,
    fileName: r.file_name ?? null,
    sizeBytes: r.size_bytes ?? null,
    width: r.width ?? null,
    height: r.height ?? null,

    status: r.status ?? "draft",
    published: r.published ?? false,

    s3Key: r.s3_key ?? null,
    r2Key: r.r2_key ?? null
  };
}

/** ===== Queries =====
 * Current schema (from your migrate.js):
 *  - id UUID PK DEFAULT gen_random_uuid()
 *  - title TEXT NOT NULL
 *  - embed_url TEXT NOT NULL
 *  - src TEXT
 *  - provider TEXT
 *  - provider_id TEXT
 *  - thumbnail TEXT
 *  - library TEXT
 *  - source TEXT
 *  - duration TEXT
 *  - date TEXT
 *  - description TEXT
 *  - tags JSONB NOT NULL DEFAULT '[]'::jsonb
 *  - created_at BIGINT NOT NULL
 *  - updated_at BIGINT NOT NULL
 *  - file_name TEXT
 *  - size_bytes BIGINT
 *  - width INT
 *  - height INT
 *  - status TEXT DEFAULT 'draft'
 *  - published BOOLEAN DEFAULT FALSE
 *  - preview_src TEXT
 *  - s3_key TEXT
 *  - r2_key TEXT
 */

export async function listVideos({ page = 1, pageSize = 20 } = {}) {
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 20));
  const offset = Math.max(0, (Number(page) || 1) - 1) * limit;

  const { rows } = await query(
    `
    SELECT
      id, title, embed_url, src,
      provider, provider_id,
      thumbnail, library, source,
      duration, date, description,
      tags, created_at, updated_at,
      file_name, size_bytes, width, height,
      status, published, preview_src,
      s3_key, r2_key
    FROM videos
    ORDER BY published DESC, created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );

  return {
    items: rows.map(mapRow),
    page: Number(page) || 1,
    pageSize: limit
  };
}

export async function getVideoById(id) {
  const { rows } = await query(
    `
    SELECT
      id, title, embed_url, src,
      provider, provider_id,
      thumbnail, library, source,
      duration, date, description,
      tags, created_at, updated_at,
      file_name, size_bytes, width, height,
      status, published, preview_src,
      s3_key, r2_key
    FROM videos
    WHERE id = $1
    `,
    [id]
  );
  return mapRow(rows[0] || null);
}

export async function insertVideo(input) {
  const now = Date.now();

  const title = (input?.title || "").trim();
  const embedUrl = (input?.embedUrl || "").trim();
  const src = (input?.src || "").trim();

  if (!title) {
    throw new Error("title is required");
  }
  // embed_url is NOT NULL in your schema
  if (!embedUrl) {
    throw new Error("embedUrl is required");
  }

  const tagsJson = serializeTags(input?.tags);

  // Optional fields (fall back to null/undefined)
  const provider = input?.provider ?? "custom";
  const providerId = input?.providerId ?? null;
  const thumbnail = input?.thumbnail ?? input?.thumbnailUrl ?? null;
  const library = input?.library ?? null;
  const source = input?.source ?? null;
  // duration stored as TEXT; accept either numeric or string
  const duration =
    input?.duration != null
      ? String(input.duration)
      : input?.durationSeconds != null
      ? String(input.durationSeconds)
      : null;
  const date = input?.date ?? null;
  const description = input?.description ?? null;

  const fileName = input?.fileName ?? null;
  const sizeBytes = input?.sizeBytes ?? null;
  const width = input?.width ?? null;
  const height = input?.height ?? null;
  const status = input?.status ?? "draft";
  const published = input?.published ?? false;
  const previewSrc = input?.previewSrc ?? null;
  const s3Key = input?.s3Key ?? null;
  const r2Key = input?.r2Key ?? null;

  const { rows } = await query(
    `
    INSERT INTO videos (
      title, embed_url, src,
      provider, provider_id,
      thumbnail, library, source,
      duration, date, description,
      tags, created_at, updated_at,
      file_name, size_bytes, width, height,
      status, published, preview_src,
      s3_key, r2_key
    ) VALUES (
      $1, $2, NULLIF($3, ''),
      $4, $5,
      $6, $7, $8,
      $9, $10, $11,
      $12::jsonb, $13, $14,
      $15, $16, $17, $18,
      $19, $20, $21,
      $22, $23
    )
    RETURNING
      id, title, embed_url, src,
      provider, provider_id,
      thumbnail, library, source,
      duration, date, description,
      tags, created_at, updated_at,
      file_name, size_bytes, width, height,
      status, published, preview_src,
      s3_key, r2_key
    `,
    [
      title,
      embedUrl,
      src,
      provider,
      providerId,
      thumbnail,
      library,
      source,
      duration,
      date,
      description,
      tagsJson,
      now,
      now,
      fileName,
      sizeBytes,
      width,
      height,
      status,
      published,
      previewSrc,
      s3Key,
      r2Key
    ]
  );

  return { video: mapRow(rows[0]) };
}

export async function updateVideo(id, input) {
  // Dynamically build SET list, always bump updated_at
  const sets = [];
  const vals = [];
  const add = (sql, v) => {
    vals.push(v);
    sets.push(sql.replace("?", `$${vals.length}`));
  };

  if (input.title !== undefined) add(`title = ?`, (input.title || "").trim());
  if (input.embedUrl !== undefined)
    add(`embed_url = ?`, (input.embedUrl || "").trim());
  if (input.src !== undefined) add(`src = NULLIF(?, '')`, (input.src || "").trim());
  if (input.provider !== undefined) add(`provider = ?`, input.provider ?? null);
  if (input.providerId !== undefined) add(`provider_id = ?`, input.providerId ?? null);

  if (input.thumbnail !== undefined || input.thumbnailUrl !== undefined) {
    add(`thumbnail = ?`, input.thumbnail ?? input.thumbnailUrl ?? null);
  }
  if (input.library !== undefined) add(`library = ?`, input.library ?? null);
  if (input.source !== undefined) add(`source = ?`, input.source ?? null);

  if (input.duration !== undefined || input.durationSeconds !== undefined) {
    const dur =
      input.duration != null
        ? String(input.duration)
        : input.durationSeconds != null
        ? String(input.durationSeconds)
        : null;
    add(`duration = ?`, dur);
  }

  if (input.date !== undefined) add(`date = ?`, input.date ?? null);
  if (input.description !== undefined) add(`description = ?`, input.description ?? null);

  if (input.tags !== undefined) add(`tags = (?::jsonb)`, serializeTags(input.tags));

  if (input.fileName !== undefined) add(`file_name = ?`, input.fileName ?? null);
  if (input.sizeBytes !== undefined) add(`size_bytes = ?`, input.sizeBytes ?? null);
  if (input.width !== undefined) add(`width = ?`, input.width ?? null);
  if (input.height !== undefined) add(`height = ?`, input.height ?? null);
  if (input.status !== undefined) add(`status = ?`, input.status ?? "draft");
  if (input.published !== undefined) add(`published = ?`, !!input.published);
  if (input.previewSrc !== undefined) add(`preview_src = ?`, input.previewSrc ?? null);
  if (input.s3Key !== undefined) add(`s3_key = ?`, input.s3Key ?? null);
  if (input.r2Key !== undefined) add(`r2_key = ?`, input.r2Key ?? null);

  // Always update timestamp
  add(`updated_at = ?`, Date.now());

  if (sets.length === 0) {
    // nothing to update; return current row
    const { rows: cur } = await query(
      `
      SELECT
        id, title, embed_url, src,
        provider, provider_id,
        thumbnail, library, source,
        duration, date, description,
        tags, created_at, updated_at,
        file_name, size_bytes, width, height,
        status, published, preview_src,
        s3_key, r2_key
      FROM videos
      WHERE id = $1
      `,
      [id]
    );
    return { video: mapRow(cur[0] || null) };
  }

  vals.push(id);

  const { rows } = await query(
    `
    UPDATE videos
    SET ${sets.join(", ")}
    WHERE id = $${vals.length}
    RETURNING
      id, title, embed_url, src,
      provider, provider_id,
      thumbnail, library, source,
      duration, date, description,
      tags, created_at, updated_at,
      file_name, size_bytes, width, height,
      status, published, preview_src,
      s3_key, r2_key
    `,
    vals
  );

  return { video: mapRow(rows[0] || null) };
}

export async function deleteVideo(id) {
  await query(`DELETE FROM videos WHERE id = $1`, [id]);
  return { ok: true };
}