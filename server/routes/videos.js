import { Router } from "express";
import crypto from "crypto";
import { getVideos, saveVideos, writeData } from "../lib/dataStore.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { notifyUsersOfNewVideo } from "../lib/notifications.js";

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

router.get("/", async (req, res, next) => {
  try {
    const videos = await getVideos();
    res.json({ videos });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, async (req, res, next) => {
  if (!requireFields(req.body, res)) return;
  try {
    const incoming = buildVideo(req.body, req.auth?.session?.user);
    const existing = await getVideos();
    const videos = [...existing, incoming];
    await saveVideos(videos);
    notifyUsersOfNewVideo(incoming).catch((error) =>
      console.error("notify failed", error)
    );
    res.status(201).json({ video: incoming });
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
    const videos = await getVideos();
    const index = videos.findIndex((v) => Number(v.id) === id);
    if (index === -1) {
      return res.status(404).json({ error: "Video not found" });
    }
    const updates = { ...req.body };
    if (updates.tags !== undefined) {
      updates.tags = normalizeTags(updates.tags);
    }
    if (updates.embedUrl || updates.src) {
      const embed = updates.embedUrl || updates.src;
      updates.embedUrl = embed;
      updates.src = updates.src || embed;
    }
    const updated = {
      ...videos[index],
      ...updates,
      id,
      updatedAt: Date.now(),
      updatedBy: req.auth?.session?.user?.id || videos[index].updatedBy
    };
    videos[index] = updated;
    await saveVideos(videos);
    res.json({ video: updated });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    let removed = null;
    await writeData((data) => {
      const videos = data.videos || [];
      const idx = videos.findIndex((v) => Number(v.id) === id);
      if (idx === -1) return data;
      removed = videos[idx];
      const nextVideos = videos.filter((v) => Number(v.id) !== id);
      const stripId = (record) => {
        if (!record) return record;
        if (Array.isArray(record)) {
          return record.filter((item) => item !== id);
        }
        const copy = { ...record };
        delete copy[id];
        return copy;
      };
      return {
        ...data,
        videos: nextVideos,
        favorites: stripId(data.favorites),
        progress: stripId(data.progress),
        durations: stripId(data.durations),
        lastWatched: stripId(data.lastWatched)
      };
    });

    if (!removed) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
