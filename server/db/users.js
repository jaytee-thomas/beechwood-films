import crypto from "crypto";
import { query } from "./pool.js";

const normalizeEmail = (value) => (value || "").trim().toLowerCase();
const toTimestamp = (value) =>
  value === null || value === undefined ? null : Number(value);

const toUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    role: row.role,
    notifyOnNewVideo: Boolean(row.notify_on_new_video),
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
};

export const getUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const { rows } = await query(
    `SELECT id, email, password, name, role, notify_on_new_video, created_at, updated_at
       FROM users
      WHERE lower(email) = $1
      LIMIT 1`,
    [normalizedEmail]
  );
  return toUser(rows[0]);
};

export const getUserById = async (id) => {
  if (!id) return null;
  const { rows } = await query(
    `SELECT id, email, password, name, role, notify_on_new_video, created_at, updated_at
       FROM users
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return toUser(rows[0]);
};

export const createUser = async ({
  email,
  passwordHash,
  name,
  role = "user",
  notifyOnNewVideo = true
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email is required to create a user");
  }
  const now = Date.now();
  const id = crypto.randomUUID();
  const { rows } = await query(
    `INSERT INTO users (
       id, email, password, name, role, notify_on_new_video, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     RETURNING id, email, password, name, role, notify_on_new_video, created_at, updated_at`,
    [
      id,
      normalizedEmail,
      passwordHash,
      name ?? normalizedEmail.split("@")[0],
      role,
      Boolean(notifyOnNewVideo),
      now
    ]
  );

  return toUser(rows[0]);
};

export const updateUserPreferences = async (id, { notifyOnNewVideo }) => {
  if (!id) return null;
  const now = Date.now();
  const { rows } = await query(
    `UPDATE users
        SET notify_on_new_video = $1,
            updated_at = $2
      WHERE id = $3
      RETURNING id, email, password, name, role, notify_on_new_video, created_at, updated_at`,
    [Boolean(notifyOnNewVideo), now, id]
  );
  return toUser(rows[0]);
};

export const ensureAdminUser = async ({ email, passwordHash }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  const now = Date.now();
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) {
    await query(
      `UPDATE users
          SET role = 'admin',
              password = $1,
              updated_at = $2
        WHERE id = $3`,
      [passwordHash || existing.password, now, existing.id]
    );
    return;
  }

  await query(
    `INSERT INTO users (
       id, email, password, name, role, notify_on_new_video, created_at, updated_at
     ) VALUES ($1, $2, $3, 'Admin', 'admin', FALSE, $4, $4)`,
    [crypto.randomUUID(), normalizedEmail, passwordHash, now]
  );
};

export const listUsersToNotify = async () => {
  const { rows } = await query(
    `SELECT id, email, name
       FROM users
      WHERE notify_on_new_video IS TRUE AND email IS NOT NULL`
  );
  return rows;
};
