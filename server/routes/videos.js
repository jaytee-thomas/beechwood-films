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

const router = Router();

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const buildVideo = (payload, author) => {
  const now = Date.now();
  const embedUrl = payload.embedUrl || payload.src || "";
  const provider = payload.provider || "custom";
  return {
    id: Number(payload.id) || now,
    title: payload.title,
    embedUrl,
    src: payload.src || embedUrl,
    previewSrc: payload.previewSrc || null,
    thumbnail: payload.thumbnail || "",
    library: payload.library || "General",
    provider,
    providerId:
      payload.providerId ||
      (provider === "youtube" && embedUrl
        ? embedUrl.split("/").pop()
        : crypto.randomUUID()),
    source: payload.source || "api",
    duration: payload.duration || null,
    date: payload.date || null,
    description: payload.description || "",
    tags: normalizeTags(payload.tags),
    fileName: payload.fileName || null,
    createdAt: payload.createdAt || now,
    createdBy: author?.id || null
  };
};

const requireFields = (body, res) => {
  const hasEmbed = body?.embedUrl || body?.src;
  if (!body?.title || !hasEmbed) {
    res.status(400).json({ error: "title and embedUrl (or src) are required" });
    return false;
  }
  return true;
};

router.get("/", (req, res, next) => {
  try {
    const videos = listVideos();
    res.json({ videos });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, (req, res, next) => {
  if (!requireFields(req.body, res)) return;
  try {
    const incoming = buildVideo(req.body, req.auth?.session?.user);
    const created = insertVideo(incoming, req.auth?.session?.user?.id);
    notifyUsersOfNewVideo(created).catch((error) =>
      console.error("notify failed", error)
    );
    res.status(201).json({ video: created });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAdmin, (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Update payload is required" });
  }
  try {
    const id = Number(req.params.id);
    const existing = getVideoById(id);
    if (!existing) {
      return res.status(404).json({ error: "Video not found" });
    }
    const updated = updateVideoRecord(
      id,
      { ...req.body },
      req.auth?.session?.user?.id
    );
    res.json({ video: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const removed = deleteVideoRecord(id);
    if (!removed) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
