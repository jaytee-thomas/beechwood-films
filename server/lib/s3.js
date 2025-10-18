import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_S3_BUCKET
} = process.env;

let client = null;

export const getS3Client = () => {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
    return null;
  }
  if (!client) {
    client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return client;
};

export const createPresignedUpload = async ({
  key,
  contentType,
  expiresIn = 900
}) => {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error("S3 client not configured");
  }

  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ACL: "public-read"
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });

  let fileUrl;
  if (process.env.AWS_S3_ENDPOINT) {
    const endpoint = process.env.AWS_S3_ENDPOINT.replace(/\/+$/, "");
    fileUrl = `${endpoint}/${AWS_S3_BUCKET}/${key}`;
  } else {
    fileUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }

  return { uploadUrl, fileUrl, bucket: AWS_S3_BUCKET, key };
};

