import { Router } from "express";
import crypto from "crypto";
import path from "path";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { createPresignedUpload, getS3Client } from "../lib/s3.js";

const router = Router();

const ensureConfigured = () => {
  const client = getS3Client();
  if (!client) {
    const missing = [
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_REGION",
      "AWS_S3_BUCKET"
    ].filter((key) => !process.env[key]);
    throw new Error(
      missing.length
        ? `S3 uploads not configured. Missing env vars: ${missing.join(", ")}`
        : "S3 uploads not configured"
    );
  }
  return client;
};

router.post("/presign", requireAdmin, async (req, res) => {
  try {
    ensureConfigured();
    const { filename, contentType } = req.body || {};
    if (!filename || !contentType) {
      return res
        .status(400)
        .json({ error: "filename and contentType are required" });
    }

    const safeName = path.basename(filename);
    const ext = path.extname(safeName);
    const key = [
      "uploads",
      new Date().toISOString().slice(0, 10),
      `${crypto.randomUUID()}${ext || ""}`
    ]
      .filter(Boolean)
      .join("/");

    const { uploadUrl, fileUrl, bucket } = await createPresignedUpload({
      key,
      contentType
    });

    res.json({
      uploadUrl,
      fileUrl,
      bucket,
      key,
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-acl": "public-read"
      }
    });
  } catch (error) {
    console.error("Failed to generate upload URL", error);
    res.status(500).json({ error: error.message || "Failed to create upload URL" });
  }
});

export default router;
