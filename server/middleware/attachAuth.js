// server/middleware/attachAuth.js
import { getSessionFromRequest } from "../routes/auth.js";

export async function attachAuth(req, _res, next) {
  try {
    const session = await getSessionFromRequest(req);
    if (session) req.auth = { session }; // so requireAdmin can see req.auth.session.user
  } catch (_) {
    // ignore – unauthenticated is fine for public GETs
  }
  next();
}