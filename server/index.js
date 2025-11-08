import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import videosRouter from "./routes/videos.js"; // <— mount this

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";

// ----- CORS -----
const clientOrigins =
  (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : [])
    .map(o => o.trim())
    .filter(Boolean);

if (!clientOrigins.length && !isProduction) {
  clientOrigins.push("http://localhost:5173");
}

app.use(
  cors({
    origin: clientOrigins.length ? clientOrigins : "*",
    credentials: true,
  })
);

// ----- Body parsing -----
app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || "10mb", extended: true }));

// ----- Health -----
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ----- API routes -----
app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter); // <— mounted here

// ----- Static SPA for prod -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

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

// ----- Global error handler -----
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = Number(err.status || err.statusCode) || 500;
  const payload = {
    error: status === 500 ? "Something went wrong" : err.message || "Request failed",
  };
  if (!isProduction && err?.stack) {
    payload.details = err.message;
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

// ----- Migrations bootstrap -----
import * as _m from "./db/migrate.js";
const migrate = _m?.migrate ?? _m?.default;
if (typeof migrate !== "function") {
  throw new Error(
    "[bootstrap] Could not resolve migrate() from ./db/migrate.js (exported keys: " +
      Object.keys(_m).join(", ") +
      ")"
  );
}

const start = async () => {
  await migrate(); // ensure tables (users + videos) exist before binding port
  app.listen(port, () => {
    console.log(`✅ API server listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error("❌ Failed to start API server", err);
  process.exit(1);
});