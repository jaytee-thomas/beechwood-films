import { getSession, touchSession } from "../lib/sessionStore.js";

const parseToken = (header) => {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return token || null;
};

export const requireAuth = (req, res, next) => {
  const token = parseToken(req.get("Authorization"));
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  touchSession(token);
  req.auth = { token, session };
  next();
};

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    const role = req.auth?.session?.user?.role;
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
};

export const requireSession = requireAuth;

export const extractToken = (req) => parseToken(req.get("Authorization"));

export const getAuthUser = (req) => req.auth?.session?.user || null;
