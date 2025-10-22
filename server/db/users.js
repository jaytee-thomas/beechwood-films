import crypto from "crypto";
import db from "./client.js";

const toUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    role: row.role,
    notifyOnNewVideo: Boolean(row.notify_on_new_video),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

export const getUserByEmail = (email) => {
  const row = db
    .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
    .get(email);
  return toUser(row);
};

export const getUserById = (id) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return toUser(row);
};

export const createUser = ({
  email,
  passwordHash,
  name,
  role = "user",
  notifyOnNewVideo = true
}) => {
  const now = Date.now();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (
      id, email, password, name, role, notify_on_new_video, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    email.toLowerCase(),
    passwordHash,
    name ?? email.split("@")[0],
    role,
    notifyOnNewVideo ? 1 : 0,
    now,
    now
  );

  return getUserById(id);
};

export const updateUserPreferences = (id, { notifyOnNewVideo }) => {
  const now = Date.now();
  db.prepare(
    `UPDATE users
     SET notify_on_new_video = ?, updated_at = ?
     WHERE id = ?`
  ).run(notifyOnNewVideo ? 1 : 0, now, id);

  return getUserById(id);
};

export const ensureAdminUser = async ({ email, passwordHash }) => {
  const existing = getUserByEmail(email);
  const now = Date.now();
  if (existing) {
    db.prepare(
      `UPDATE users
         SET role = 'admin',
             password = ?,
             updated_at = ?
       WHERE id = ?`
    ).run(passwordHash || existing.password, now, existing.id);
    return;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (
      id, email, password, name, role, notify_on_new_video, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'admin', 0, ?, ?)`
  ).run(id, email.toLowerCase(), passwordHash, "Admin", now, now);
};

export const listUsersToNotify = () => {
  const rows = db
    .prepare(
      `SELECT id, email, name
       FROM users
       WHERE notify_on_new_video = 1 AND email IS NOT NULL`
    )
    .all();
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name
  }));
};
