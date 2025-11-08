import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";

// TEMP: disable other routes until migrated to Postgres
// import videosRouter from "./routes/videos.js";
// import favoritesRouter from "./routes/favorites.js";
// import uploadsRouter from "./routes/uploads.js";
// import profileRouter from "./routes/profile.js";
// import settingsRouter from "./routes/settings.js";
// import contentRouter from "./routes/content.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigins = (
  process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : []
)
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

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
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Auth routes only (for now)
app.use("/api/auth", authRouter);

// Static serving for production
if (isProduction) {
  app.use(express.static(distDir));

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api/")) return next();
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(distDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

// Global error handler
app.use((err, req, res, _next) => {
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

// --- robust migrate resolver (works for named or default export) ---
import * as _m from "./db/migrate.js";
const migrate = _m?.migrate ?? _m?.default;
if (typeof migrate !== "function") {
  throw new Error(
    "[bootstrap] Could not resolve migrate() from ./db/migrate.js (exported keys: " +
      Object.keys(_m).join(", ") +
      ")"
  );
}

// ====== BOOT AFTER MIGRATIONS ======
const start = async () => {
  await migrate(); // ensure tables exist
  app.listen(port, () => {
    console.log(`✅ API server listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error("❌ Failed to start API server", err);
  process.exit(1);
});