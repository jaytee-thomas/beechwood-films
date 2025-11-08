import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export async function presignPut({ key, contentType, expiresSec = 600 }) {
  const cmd = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: expiresSec });
  const publicUrl = `${process.env.AWS_S3_ENDPOINT}/${process.env.AWS_S3_BUCKET}/${encodeURIComponent(key)}`;
  return { uploadUrl, publicUrl };
}