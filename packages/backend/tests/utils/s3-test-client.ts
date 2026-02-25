import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { test as base } from "vitest";
import { randomUUID } from "crypto";

const runId = randomUUID().slice(0, 8);

export function createTestS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT!,
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY!,
      secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.MINIO_BUCKET ?? "starter-codes";

export function testKey(label: string): string {
  return `__test__/${runId}/${label}/starter-code.zip`;
}

export async function uploadTestObject(
  client: S3Client,
  key: string,
  body: Buffer | Uint8Array,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/zip",
    }),
  );
}

export async function objectExists(
  client: S3Client,
  key: string,
): Promise<boolean> {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteTestObject(
  client: S3Client,
  key: string,
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

/**
 * Extended test with S3 client fixture and automatic key cleanup.
 *
 * Usage:
 *   import { s3test } from "../utils/s3-test-client";
 *
 *   s3test("my test", async ({ s3, cleanup }) => {
 *     const key = testKey("my-label");
 *     cleanup(key);
 *     // ... use s3 client and key
 *   });
 */
export const s3test = base.extend<{
  s3: S3Client;
  cleanup: (key: string) => void;
}>({
  s3: async ({}, use) => {
    const client = createTestS3Client();
    await use(client);
    client.destroy();
  },
  cleanup: async ({}, use) => {
    const keys: string[] = [];
    await use((key: string) => keys.push(key));
    // Teardown: delete all registered keys
    const client = createTestS3Client();
    await Promise.all(keys.map((key) => deleteTestObject(client, key)));
    client.destroy();
  },
});
