import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import videosRouter from "./routes/videos.js";
import favoritesRouter from "./routes/favorites.js";
import uploadsRouter from "./routes/uploads.js";
import profileRouter from "./routes/profile.js";
//import settingsRouter from "./routes/settings.js";
import contentRouter from "./routes/content.js";
import { migrate } from "./db/migrate.js";

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

if (!clientOrigins.length && process.env.NODE_ENV !== "production") {
  clientOrigins.push("http://localhost:5173");
}

if (clientOrigins.length) {
  app.use(
    cors({
      origin: clientOrigins,
      credentials: true
    })
  );
} else {
  app.use(cors());
}

app.use(express.json({ limit: process.env.BODY_LIMIT || "10mb" }));
app.use(express.urlencoded({ limit: process.env.BODY_LIMIT || "10mb", extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/profile", profileRouter);
//app.use("/api/settings", settingsRouter);
app.use("/api/content", contentRouter);

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

app.use((err, req, res, _next) => {
  console.error(err);
  const status = Number(err.status || err.statusCode) || 500;
  const payload = {
    error: status === 500 ? "Something went wrong" : err.message || "Request failed"
  };
  if (process.env.NODE_ENV !== "production" && err?.stack) {
    payload.details = err.message;
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

const start = async () => {
  try {
    await migrate(); // Runs Postgres migrations and seeds admin
    app.listen(port, () => {
      console.log(`✅ API server listening on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

start().catch((err) => {
  console.error("Failed to start API server", err);
  process.exit(1);
});
