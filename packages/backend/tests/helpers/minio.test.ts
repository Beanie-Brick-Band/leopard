import { describe, expect } from "vitest";
import {
  getObjectKey,
  generateUploadUrl,
  generateDownloadUrl,
  deleteObject,
} from "../../convex/helpers/minio";
import {
  s3test,
  testKey,
  uploadTestObject,
  objectExists,
} from "../utils/s3-test-client";

describe("getObjectKey", () => {
  s3test(
    "returns correct format: {classroomId}/{assignmentId}/starter-code.zip",
    () => {
      const key = getObjectKey("classroom-1", "assignment-2");
      expect(key).toBe("classroom-1/assignment-2/starter-code.zip");
    },
  );

  s3test("handles Convex ID-like strings", () => {
    const key = getObjectKey("k17a3xrfqe4n5g", "j57b8yrghd2m4p");
    expect(key).toBe("k17a3xrfqe4n5g/j57b8yrghd2m4p/starter-code.zip");
  });

  s3test("handles special characters", () => {
    const key = getObjectKey("class room/1", "assign&ment=2");
    expect(key).toBe("class room/1/assign&ment=2/starter-code.zip");
  });
});

describe("generateUploadUrl", () => {
  s3test(
    "returns a presigned URL with X-Amz-Signature and 900s expiry",
    async () => {
      const key = testKey("upload-url");
      const url = await generateUploadUrl(key);

      expect(url).toContain("X-Amz-Signature");
      expect(url).toContain("X-Amz-Expires=900");
    },
  );

  s3test(
    "returns a URL that accepts a PUT upload",
    async ({ s3, cleanup }) => {
      const key = testKey("upload-put");
      cleanup(key);

      const url = await generateUploadUrl(key);
      const body = Buffer.from("test-upload-content");

      const response = await fetch(url, {
        method: "PUT",
        body,
        headers: { "Content-Type": "application/zip" },
      });

      expect(response.ok).toBe(true);
      expect(await objectExists(s3, key)).toBe(true);
    },
  );
});

describe("generateDownloadUrl", () => {
  s3test(
    "downloads uploaded content correctly (round-trip)",
    async ({ s3, cleanup }) => {
      const key = testKey("download-roundtrip");
      cleanup(key);

      const content = Buffer.from("download-test-content");
      await uploadTestObject(s3, key, content);

      const url = await generateDownloadUrl(key);
      const response = await fetch(url);

      expect(response.ok).toBe(true);
      const downloaded = Buffer.from(await response.arrayBuffer());
      expect(downloaded.toString()).toBe("download-test-content");
    },
  );

  s3test("returns 404 for non-existent object", async () => {
    const key = testKey("nonexistent-download");
    const url = await generateDownloadUrl(key);
    const response = await fetch(url);

    expect(response.status).toBe(404);
  });
});

describe("deleteObject", () => {
  s3test("deletes an existing object", async ({ s3 }) => {
    const key = testKey("delete-existing");
    await uploadTestObject(s3, key, Buffer.from("to-be-deleted"));

    expect(await objectExists(s3, key)).toBe(true);

    await deleteObject(key);

    expect(await objectExists(s3, key)).toBe(false);
  });

  s3test("does not throw for non-existent object", async () => {
    const key = testKey("delete-nonexistent");
    await expect(deleteObject(key)).resolves.toBeUndefined();
  });

  s3test("is idempotent: double-delete does not throw", async ({ s3 }) => {
    const key = testKey("delete-idempotent");
    await uploadTestObject(s3, key, Buffer.from("delete-me-twice"));

    await deleteObject(key);
    await expect(deleteObject(key)).resolves.toBeUndefined();
  });
});
