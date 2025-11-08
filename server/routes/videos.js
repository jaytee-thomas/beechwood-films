import { Router } from "express";
import { listVideos, createVideo, deleteVideo, getVideo } from "../db/videos.pg.js";
import { requireAuth, getAuthUser } from "../middleware/requireAdmin.js";

const router = Router();

// GET /api/videos?page=1&pageSize=20
router.get("/", async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const items = await listVideos({ page, pageSize, publishedOnly: true });
    res.json({ items, page, pageSize });
  } catch (err) {
    next(err);
  }
});

// GET /api/videos/:id
router.get("/:id", async (req, res, next) => {
  try {
    const video = await getVideo(req.params.id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.json({ video });
  } catch (err) {
    next(err);
  }
});

// POST /api/videos  (admin only)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const me = getAuthUser(req);
    if (me?.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const { title, description, s3Key, thumbnailUrl, durationSeconds, published = true } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });

    const created = await createVideo({
      title,
      description,
      s3Key,
      thumbnailUrl,
      durationSeconds,
      published,
    });

    res.status(201).json({ video: created });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/videos/:id  (admin only)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const me = getAuthUser(req);
    if (me?.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    await deleteVideo(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;