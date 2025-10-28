import express from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { getContent, saveContent } from "../db/content.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const content = getContent();
  res.json({ content });
});

router.put("/", requireAdmin, (req, res, next) => {
  try {
    const content = saveContent(req.body || {});
    res.json({ content });
  } catch (error) {
    next(error);
  }
});

export default router;
