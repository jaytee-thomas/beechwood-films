// server/routes/uploads.js
import { Router } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

// Build an S3 client for Cloudflare R2 (or S3-compatible storage)
function makeS3() {
  const endpoint = process.env.AWS_S3_ENDPOINT; // e.g. https://<accountid>.r2.cloudflarestorage.com
  const region = process.env.AWS_REGION || "auto";

  if (!endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2/S3 env vars (AWS_S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true, // required by R2
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * POST /api/uploads/presign
 * Body: { fileName: string, contentType: string, size?: number }
 * Returns: { url, method, headers, key, publicUrl? }
 */
router.post("/presign", requireAdmin, async (req, res, next) => {
  try {
    const { fileName, contentType, size } = req.body || {};
    if (!fileName || !contentType) {
      return res.status(400).json({ error: "fileName and contentType are required" });
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({ error: "Missing AWS_S3_BUCKET" });
    }

    // Choose a key convention; nest by date for cleanliness
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const key = `uploads/${y}/${m}/${d}/${fileName}`;

    const s3 = makeS3();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // R2 ignores ContentLength for pre-signing, but we keep the param around
      // to show intent and for S3 parity.
    });

    // Default expiry 15 minutes
    const expiresIn = 60 * 15;
    const url = await getSignedUrl(s3, command, { expiresIn });

    // Optional: if you have a CDN/public base URL, surface it (otherwise clients can derive)
    const publicBase = process.env.AWS_PUBLIC_BASE_URL; // e.g. your Cloudflare R2 custom domain or CDN
    const publicUrl = publicBase ? `${publicBase.replace(/\/+$/, "")}/${key}` : undefined;

    return res.json({
      url,
      method: "PUT",
      headers: { "Content-Type": contentType },
      key,
      publicUrl,
      expiresIn,
      size: size ?? null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;