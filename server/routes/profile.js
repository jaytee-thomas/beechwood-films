import express from "express";
import { profileFields } from "../../shared/defaultProfile.js";
import { getProfile, saveProfile } from "../db/profile.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

const MAX_INLINE_IMAGE_BYTES = Number(process.env.PROFILE_IMAGE_LIMIT || 3 * 1024 * 1024);

const approximateDataUrlBytes = (value) => {
  if (!value) return 0;
  // Rough estimate: base64 encodes every 3 bytes into 4 chars, minus potential padding
  return Math.ceil((value.length * 3) / 4);
};

router.get("/", (_req, res) => {
  const profile = getProfile();
  res.json({ profile });
});

router.put("/", requireAdmin, (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const updates = {};

    for (const field of profileFields) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) continue;
      const raw = payload[field];
      if (field === "photo") {
        if (typeof raw === "string") {
          const trimmed = raw.trim();
          if (trimmed && trimmed.startsWith("data:image")) {
            const estimated = approximateDataUrlBytes(trimmed);
            if (estimated > MAX_INLINE_IMAGE_BYTES) {
              const error = new Error("Profile image is too large. Please upload something under 3 MB.");
              error.status = 413;
              throw error;
            }
          }
          updates[field] = trimmed;
        } else if (raw == null) {
          updates[field] = "";
        }
      } else if (typeof raw === "string") {
        updates[field] = raw.trim();
      } else if (raw == null) {
        updates[field] = "";
      }
    }

    const profile = saveProfile(updates);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

export default router;
