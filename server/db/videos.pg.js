import pool from "./pool.js";
import crypto from "crypto";

const now = () => Date.now();

export async function listVideos({ page=1, pageSize=20, publishedOnly=true } = {}) {
  const limit = Math.min(Math.max(+pageSize,1),100);
  const offset = (Math.max(+page,1)-1)*limit;
  const where = publishedOnly ? "WHERE published = TRUE" : "";
  const { rows } = await pool.query(`
    SELECT id,title,description,s3_key,thumbnail_url,duration_seconds,published,created_at,updated_at
    FROM videos ${where}
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,[limit,offset]);
  return rows;
}

export async function createVideo({ title, description, s3Key, thumbnailUrl, durationSeconds, published=true }) {
  const id = crypto.randomUUID();
  const ts = now();
  const { rows } = await pool.query(`
    INSERT INTO videos (id,title,description,s3_key,thumbnail_url,duration_seconds,published,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `,[id,title,description??null,s3Key??null,thumbnailUrl??null,durationSeconds??null,!!published,ts,ts]);
  return rows[0];
}

export async function getVideo(id) {
  const { rows } = await pool.query(`
    SELECT id,title,description,s3_key,thumbnail_url,duration_seconds,published,created_at,updated_at
    FROM videos WHERE id=$1 LIMIT 1
  `,[id]);
  return rows[0] ?? null;
}

export async function deleteVideo(id) {
  await pool.query(`DELETE FROM videos WHERE id=$1`,[id]);
}