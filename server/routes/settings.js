import express from "express";
import { getSettings, updateSettings } from "../db/settings.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.get("/", (_req, res) => {
  const settings = getSettings();
  res.json({ settings });
});

router.put("/", requireAdmin, (req, res, next) => {
  try {
    const settings = updateSettings(req.body || {});
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
