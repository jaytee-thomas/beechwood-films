import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { presignPut } from "../lib/r2.js";

const router = Router();

router.post("/presign", requireAdmin, async (req, res, next) => {
  try {
    const { fileName, contentType, size } = req.body || {};
    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName and contentType are required" });
    }
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { uploadUrl, publicUrl } = await presignPut({ key, contentType });
    return res.json({ uploadUrl, r2Key: key, publicUrl, size });
  } catch (e) { next(e); }
});

export default router;