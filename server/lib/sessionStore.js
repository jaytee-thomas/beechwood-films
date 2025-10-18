import crypto from "crypto";

const sessions = new Map();
const ttlMs = Number(process.env.ADMIN_SESSION_TTL_MS || 1000 * 60 * 60 * 6);

const now = () => Date.now();

const buildSession = (user) => ({
  token: crypto.randomBytes(32).toString("hex"),
  createdAt: now(),
  expiresAt: now() + ttlMs,
  user: {
    id: user.id,
    email: user.email,
    role: user.role || "user",
    notifyOnNewVideo: Boolean(user.notifyOnNewVideo)
  }
});

const isExpired = (session) => session.expiresAt <= now();

export const createSession = (user) => {
  const session = buildSession(user);
  sessions.set(session.token, session);
  return session;
};

export const getSession = (token) => {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (isExpired(session)) {
    sessions.delete(token);
    return null;
  }
  return session;
};

export const deleteSession = (token) => {
  if (!token) return;
  sessions.delete(token);
};

export const touchSession = (token) => {
  const session = getSession(token);
  if (!session) return null;
  session.expiresAt = now() + ttlMs;
  sessions.set(token, session);
  return session;
};
