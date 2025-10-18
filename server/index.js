import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import videosRouter from "./routes/videos.js";
import favoritesRouter from "./routes/favorites.js";
import uploadsRouter from "./routes/uploads.js";
import { initializeDatabase } from "./db/setup.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigin =
  process.env.CLIENT_ORIGIN ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "http://localhost:5173");

if (clientOrigin) {
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true
    })
  );
} else {
  app.use(cors());
}

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRouter);
app.use("/api/videos", videosRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/uploads", uploadsRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const start = async () => {
  initializeDatabase();
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
};

start().catch((err) => {
  console.error("Failed to start API server", err);
  process.exit(1);
});
