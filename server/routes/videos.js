// server/routes/videos.js
import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { notifyUsersOfNewVideo } from "../lib/notifications.js";
import {
  listVideos,
  insertVideo,
  updateVideo,
  deleteVideo,
  getVideoById,
  getRelatedVideosFor
} from "../db/videos.js";
import { getVideoSignalsForVideo } from "../db/videoSignals.js";

const router = Router();

const dbg = (...args) => {
  if (process.env.DEBUG_VIDEOS === "1") console.log("[videos]", ...args);
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === "string") {
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
};

const LIBRARY_ALIASES = {
  vids: "Videos",
  videos: "Videos",
  video: "Videos",
  reels: "Reels",
  reel: "Reels",
  shorts: "Reels",
  short: "Reels",
  docs: "Documentaries",
  documentaries: "Documentaries",
  documentary: "Documentaries",
  nsfw: "NSFW"
};
const normalizeLibrary = (value) => {
  if (!value) return "Videos";
  const key = String(value).trim().toLowerCase();
  return LIBRARY_ALIASES[key] || value;
};

const buildVideo = (payload, author) => {
  const now = Date.now();
  const embedUrl = payload.embedUrl || payload.src || "";
  const provider = payload.provider || "custom";
  return {
    id: payload.id || crypto.randomUUID(),
    title: payload.title?.trim(),
    embedUrl,
    src: payload.src || embedUrl,
    previewSrc: payload.previewSrc || null,
    thumbnail: payload.thumbnail || null,
    library: normalizeLibrary(payload.library),
    provider,
    providerId:
      payload.providerId ||
      (provider === "youtube" && embedUrl ? embedUrl.split("/").pop() : crypto.randomUUID()),
    source: payload.source || "api",
    duration: payload.duration ?? null,
    date: payload.date ?? null,
    description: payload.description?.trim() || null,
    tags: normalizeTags(payload.tags),
    fileName: payload.fileName || null,
    createdAt: payload.createdAt || now,
    createdBy: author?.id || null
  };
};

const requireFields = (body, res) => {
  if (!body) {
    res.status(400).json({ error: "title and embedUrl (or src) are required" });
    return false;
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const rawEmbed = typeof body.embedUrl === "string" ? body.embedUrl : body.src;
  const embed = typeof rawEmbed === "string" ? rawEmbed.trim() : "";

  if (!title || !embed) {
    res.status(400).json({ error: "title and embedUrl (or src) are required" });
    return false;
  }
  body.title = title;
  if (body.embedUrl !== undefined) body.embedUrl = embed;
  else body.src = embed;
  return true;
};

// LIST
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)));
    const sort = req.query.sort === "latest" ? "latest" : "top";
    const out = await listVideos({ page, pageSize, sort });
    // Ensure consistent envelope
    if (Array.isArray(out)) {
      return res.json({ items: out, page, pageSize });
    }
    return res.json(out);
  } catch (err) {
    dbg("GET / -> error", err);
    next(err);
  }
});

// CREATE
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    if (!requireFields(req.body, res)) return;
    const incoming = buildVideo(req.body, req.auth?.session?.user);
    const created = await insertVideo(incoming, req.auth?.session?.user?.id);
    // fire and forget notifications
    notifyUsersOfNewVideo(created).catch((e) => console.error("[notify] failed", e));
    res.status(201).json({ video: created });
  } catch (err) {
    dbg("POST / -> error", err);
    next(err);
  }
});

// READ ONE
router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const video = await getVideoById(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json({ video });
  } catch (err) {
    dbg("GET /:id -> error", err);
    next(err);
  }
});

router.get("/:id/signals", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await getVideoSignalsForVideo(id);
    if (!data) {
      return res.status(404).json({ error: "Signals not found for this video" });
    }
    res.json(data);
  } catch (err) {
    dbg("GET /:id/signals -> error", err);
    next(err);
  }
});

// RELATED
router.get("/:id/related", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const items = await getRelatedVideosFor(id, limit);
    res.json({ videoId: id, items });
  } catch (err) {
    dbg("GET /:id/related -> error", err);
    next(err);
  }
});

// UPDATE
const handleUpdate = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Update payload is required" });
    }
    const id = String(req.params.id);
    const updates = { ...req.body };
    if (updates.tags !== undefined) updates.tags = normalizeTags(updates.tags);
    if (updates.library !== undefined) updates.library = normalizeLibrary(updates.library);
    if (typeof updates.title === "string") updates.title = updates.title.trim();
    if (typeof updates.description === "string") updates.description = updates.description.trim();

    const updated = await updateVideo(id, updates);
    const video = updated?.video ?? updated;
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json({ video });
  } catch (err) {
    dbg("UPDATE /:id -> error", err);
    next(err);
  }
};

router.put("/:id", requireAdmin, handleUpdate);
router.patch("/:id", requireAdmin, handleUpdate);

// DELETE
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const removed = await deleteVideo(id);
    if (!removed) return res.status(404).json({ error: "Video not found" });
    res.status(204).send();
  } catch (err) {
    dbg("DELETE /:id -> error", err);
    next(err);
  }
});

// OPTIONAL: write a fallback snapshot of current videos
router.post("/fallback", requireAdmin, async (_req, res, next) => {
  try {
    // If you have a fallback saver in Postgres, call it here.
    // For now just 204 to keep parity.
    res.status(204).send();
  } catch (err) {
    dbg("POST /fallback -> error", err);
    next(err);
  }
});

export default router;
