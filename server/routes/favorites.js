import { Router } from "express";
import { requireAuth, getAuthUser } from "../middleware/requireAdmin.js";
import {
  listFavoriteIds,
  addFavorite,
  removeFavorite
} from "../db/favorites.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "guest") {
    return res.status(403).json({ error: "Guests cannot manage favorites" });
  }
  const ids = listFavoriteIds(user.id);
  res.json({ favorites: ids });
});

router.post("/:videoId", requireAuth, (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "guest") {
    return res.status(403).json({ error: "Guests cannot manage favorites" });
  }
  const videoId = Number(req.params.videoId);
  if (!Number.isFinite(videoId)) {
    return res.status(400).json({ error: "Invalid video id" });
  }
  const video = addFavorite(user.id, videoId);
  if (!video) {
    return res.status(404).json({ error: "Video not found" });
  }
  res.status(201).json({ videoId });
});

router.delete("/:videoId", requireAuth, (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "guest") {
    return res.status(403).json({ error: "Guests cannot manage favorites" });
  }
  const videoId = Number(req.params.videoId);
  if (!Number.isFinite(videoId)) {
    return res.status(400).json({ error: "Invalid video id" });
  }
  const removed = removeFavorite(user.id, videoId);
  if (!removed) {
    return res.status(404).json({ error: "Favorite not found" });
  }
  res.status(204).send();
});

export default router;
