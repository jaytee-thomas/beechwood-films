import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { attachAuth } from "./middleware/attachAuth.js";
import authRouter from "./routes/auth.js";
import videosRouter from "./routes/videos.js";

// uploads can crash at import if env is missing; import defensively
let uploadsRouter = null;
try {
  uploadsRouter = (await import("./routes/uploads.js")).default;
} catch (e) {
  console.warn("[boot] uploads router disabled at boot:", e?.message || e);
}

import * as _m from "./db/migrate.js";
const migrate = _m?.migrate ?? _m?.default;

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const host = "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

const clientOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

if (!clientOrigins.length && !isProduction) {
  clientOrigins.push("http://localhost:5173");
}

app.use(
  cors({
    origin: clientOrigins.length ? clientOrigins : "*",
    credentials: true
  })
);

app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || "10mb", extended: true }));

// readiness
let ready = false;
let lastError = null;

app.get("/health", (_req, res) => {
  res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "starting",
    ready,
    uptime: process.uptime(),
    error: ready ? null : (lastError ? String(lastError) : null)
  });
});

// middleware + routes
app.use("/api", attachAuth);
app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter);
if (uploadsRouter) app.use("/api/uploads", uploadsRouter);

// static (prod)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
if (isProduction) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api/")) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(distDir, "index.html"), (err) => (err ? next(err) : undefined));
  });
}

// error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = Number(err.status || err.statusCode) || 500;
  const payload = {
    error: status === 500 ? "Something went wrong" : err.message || "Request failed"
  };
  if (!isProduction && err?.stack) {
    payload.details = err.message;
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

// bind first, then migrate in background
app.listen(port, host, () => {
  console.log(`API server listening on ${host}:${port}`);
});

(async () => {
  try {
    if (typeof migrate !== "function") throw new Error("migrate() not exported");
    const t0 = Date.now();
    await migrate();
    console.log("[pg] migrations applied in", Date.now() - t0, "ms");
    ready = true;
  } catch (e) {
    lastError = e;
    console.error("[bootstrap] migrate failed:", e);
    // leave process up so /health returns 503 (not 502)
  }
})();

setTimeout(() => {
  if (!ready) console.error("[watchdog] still not ready after 60s; check DATABASE_URL and PG SSL");
}, 60_000);

process.on("uncaughtException", (e) => { lastError = e; console.error(e); });
process.on("unhandledRejection", (e) => { lastError = e; console.error(e); });
