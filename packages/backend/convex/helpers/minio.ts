import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Re-export for convenience (pure function, no AWS SDK dependency)
export { getObjectKey } from "./storageKeys";

function getClient() {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT!, // https://minio.nolapse.tech
    region: "us-east-1", // MinIO ignores this but SDK requires it
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true, // Required for MinIO
  });
}

const BUCKET = process.env.MINIO_BUCKET ?? "starter-codes";

export async function generateUploadUrl(key: string): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/zip",
  });
  return getSignedUrl(client, command, { expiresIn: 900 }); // 15 minutes
}

export async function generateDownloadUrl(key: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 }); // 60 minutes
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
