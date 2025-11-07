import "dotenv/config";
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  createSession,
  deleteSession,
  getSession
} from "../lib/sessionStore.js";
import {
  extractToken,
  requireAuth,
  getAuthUser
} from "../middleware/requireAdmin.js";
import {
  getUserByEmail,
  createUser,
  updateUserPreferences,
  ensureAdminUser
} from "../db/users.js";

const router = Router();

// --- helpers ---
const normalizeEmail = (e) => (e || "").trim().toLowerCase();
const sanitizeUser = (user) => {
  if (!user) return null;
  const { password: _password, ...rest } = user;
  return rest;
};
const dbg = (...args) => {
  if (process.env.DEBUG_AUTH === "1") console.log("[auth]", ...args);
};

// --- seed admin using HASH (not plaintext) ---
const ensureAdminSeed = async () => {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const adminHash = process.env.ADMIN_PASSWORD_HASH; // already bcrypt
  if (!adminEmail || !adminHash) {
    console.warn("[auth] Admin seed skipped: missing ADMIN_EMAIL or ADMIN_PASSWORD_HASH");
    return;
  }
  // Do NOT re-hash adminHash
  await ensureAdminUser({ email: adminEmail, passwordHash: adminHash });
  console.log("[auth] seeded admin:", { email: adminEmail, hashLen: adminHash.length });
};

ensureAdminSeed().catch((err) => {
  console.error("[auth] Failed to ensure admin account", err);
});

// --- routes ---
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, subscribe = true } = req.body || {};
    const emailNorm = normalizeEmail(email);

    if (!emailNorm || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = getUserByEmail(emailNorm);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role = emailNorm === normalizeEmail(process.env.ADMIN_EMAIL) ? "admin" : "user";

    const user = createUser({
      email: emailNorm,                // store normalized
      passwordHash,
      name,
      notifyOnNewVideo: !!subscribe,
      role
    });

    const session = createSession(user);
    return res.status(201).json({
      token: session.token,
      user: sanitizeUser(user),
      expiresAt: session.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = normalizeEmail(email);
    if (!emailNorm || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = getUserByEmail(emailNorm);
    if (!user) {
      dbg("no such user", emailNorm);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    dbg("compare", { emailMatch: true, hashLen: (user.password || "").length, ok: isValid });
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const session = createSession(user);
    return res.json({
      token: session.token,
      user: sanitizeUser(user),
      expiresAt: session.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

router.post("/guest", async (_req, res, next) => {
  try {
    const guestUser = {
      id: `guest-${crypto.randomUUID()}`,
      email: null,
      role: "guest",
      notifyOnNewVideo: false
    };
    const session = createSession(guestUser);
    return res.status(201).json({
      token: session.token,
      user: session.user,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res) => {
  const token = extractToken(req);
  if (token) {
    deleteSession(token);
  }
  return res.status(204).send();
});

router.get("/session", (req, res) => {
  const token = extractToken(req);
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ active: false });
  }
  return res.json({
    active: true,
    expiresAt: session.expiresAt,
    user: session.user
  });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: getAuthUser(req) });
});

router.patch("/me/preferences", requireAuth, async (req, res, next) => {
  try {
    const user = getAuthUser(req);
    if (!user || !user.id || user.role === "guest") {
      return res.status(400).json({ error: "Guests cannot update preferences" });
    }

    const { notifyOnNewVideo } = req.body || {};
    if (typeof notifyOnNewVideo !== "boolean") {
      return res.status(400).json({ error: "notifyOnNewVideo must be boolean" });
    }

    const updatedUser = updateUserPreferences(user.id, { notifyOnNewVideo });
    const session = createSession(updatedUser);

    const token = extractToken(req);
    if (token) deleteSession(token); // rotate

    return res.json({
      token: session.token,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    next(error);
  }
});

export default router;