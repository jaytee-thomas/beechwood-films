import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { notifyUsersOfNewVideo } from "../lib/notifications.js";
import {
  listVideos,
  insertVideo,
  updateVideo as updateVideoRecord,
  deleteVideo as deleteVideoRecord,
  getVideoById
} from "../db/videos.js";
import { saveFallbackVideos } from "../db/fallback.js";

const router = Router();

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
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

  // If R2 upload provided
  if (payload.r2Key) {
    return {
      id: crypto.randomUUID(),
      title: payload.title?.trim(),
      description: payload.description || null,
      s3_key: payload.r2Key,
      provider: "r2",
      status: payload.status || "uploaded",
      published: false,
      created_at: now,
      updated_at: now,
      created_by: author?.id || null
    };
  }

  // Otherwise use normal embed video path
  const embedUrl = payload.embedUrl || payload.src || "";
  const provider = payload.provider || "custom";
  return {
    id: Number(payload.id) || now,
    title: payload.title?.trim(),
    embedUrl,
    src: payload.src || embedUrl,
    previewSrc: payload.previewSrc || null,
    thumbnail: payload.thumbnail || "",
    library: normalizeLibrary(payload.library),
    provider,
    providerId:
      payload.providerId ||
      (provider === "youtube" && embedUrl
        ? embedUrl.split("/").pop()
        : crypto.randomUUID()),
    source: payload.source || "api",
    duration: payload.duration || null,
    date: payload.date || null,
    description: payload.description?.trim() || "",
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

  if (!title || (!embed && !body.r2Key)) {
    res
      .status(400)
      .json({ error: "title and embedUrl (or src) or r2Key are required" });
    return false;
  }
  body.title = title;
  if (body.embedUrl !== undefined) {
    body.embedUrl = embed;
  } else if (!body.r2Key) {
    body.src = embed;
  }
  return true;
};

router.get("/", async (_req, res, next) => {
  try {
    const videos = await listVideos();
    res.json({ items: videos, page: 1, pageSize: videos.length || 20 });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  if (!requireFields(req.body, res)) return;
  try {
    const incoming = buildVideo(req.body, req.auth?.session?.user);
    const created = await insertVideo(incoming, req.auth?.session?.user?.id);
    notifyUsersOfNewVideo(created).catch((error) =>
      console.error("notify failed", error)
    );
    res.status(201).json({ video: created });
  } catch (error) {
    next(error);
  }
});

router.post("/fallback", requireAdmin, async (_req, res, next) => {
  try {
    const videos = await listVideos();
    await saveFallbackVideos(videos);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAdmin, async (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Update payload is required" });
  }
  try {
    const id = Number(req.params.id);
    const existing = await getVideoById(id);
    if (!existing) {
      return res.status(404).json({ error: "Video not found" });
    }
    const updates = { ...req.body };
    if (updates.tags !== undefined) {
      updates.tags = normalizeTags(updates.tags);
    }
    if (updates.library !== undefined) {
      updates.library = normalizeLibrary(updates.library);
    }
    if (typeof updates.title === "string") {
      updates.title = updates.title.trim();
    }
    if (typeof updates.description === "string") {
      updates.description = updates.description.trim();
    }
    const updated = await updateVideoRecord(id, updates, req.auth?.session?.user?.id);
    res.json({ video: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const removed = await deleteVideoRecord(id);
    if (!removed) {
      return res.status(404).json({ error: "Video not found" });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// === NEW: Publish endpoint ===
router.post("/:id/publish", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const updated = await updateVideoRecord(id, {
      status: "published",
      published: true,
      updatedAt: Date.now()
    }, req.auth?.session?.user?.id);
    res.json({ video: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
