import { describe, expect } from "vitest";
import {
  getObjectKey,
  generateUploadUrl,
  generateDownloadUrl,
  deleteObject,
} from "../../convex/helpers/minio";
import { s3test, testKey } from "../utils/s3-test-client";

describe.sequential("Starter code full lifecycle", () => {
  s3test("upload → download → delete → 404", async ({ cleanup }) => {
    // 1. Generate object key (verify the helper works)
    const rawKey = getObjectKey("test-classroom", "test-assignment-lifecycle");
    expect(rawKey).toContain("starter-code.zip");

    // Use a test-namespaced key to avoid polluting real data
    const key = testKey("lifecycle");
    cleanup(key);

    // 2. Upload via presigned URL (simulating browser PUT)
    const uploadUrl = await generateUploadUrl(key);
    const content = Buffer.from("lifecycle-test-zip-content");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      body: content,
      headers: { "Content-Type": "application/zip" },
    });
    expect(uploadRes.ok).toBe(true);

    // 3. Download via presigned URL (simulating workspace startup script)
    const downloadUrl = await generateDownloadUrl(key);
    const downloadRes = await fetch(downloadUrl);
    expect(downloadRes.ok).toBe(true);
    const downloaded = Buffer.from(await downloadRes.arrayBuffer());
    expect(downloaded.toString()).toBe("lifecycle-test-zip-content");

    // 4. Delete object (simulating removeStarterCode / deleteAssignment)
    await deleteObject(key);

    // 5. Verify download returns 404 after deletion
    const postDeleteUrl = await generateDownloadUrl(key);
    const postDeleteRes = await fetch(postDeleteUrl);
    expect(postDeleteRes.status).toBe(404);
  });
});

describe("Starter code replacement flow", () => {
  s3test(
    "upload v1 → download v1 → upload v2 → download v2 → content changed",
    async ({ cleanup }) => {
      const key = testKey("replacement");
      cleanup(key);

      // Upload v1
      const uploadUrl1 = await generateUploadUrl(key);
      const v1Content = Buffer.from("version-1-content");
      await fetch(uploadUrl1, {
        method: "PUT",
        body: v1Content,
        headers: { "Content-Type": "application/zip" },
      });

      // Download v1
      const downloadUrl1 = await generateDownloadUrl(key);
      const res1 = await fetch(downloadUrl1);
      expect(Buffer.from(await res1.arrayBuffer()).toString()).toBe(
        "version-1-content",
      );

      // Upload v2 (same key, overwrites)
      const uploadUrl2 = await generateUploadUrl(key);
      const v2Content = Buffer.from("version-2-content");
      await fetch(uploadUrl2, {
        method: "PUT",
        body: v2Content,
        headers: { "Content-Type": "application/zip" },
      });

      // Download v2
      const downloadUrl2 = await generateDownloadUrl(key);
      const res2 = await fetch(downloadUrl2);
      expect(Buffer.from(await res2.arrayBuffer()).toString()).toBe(
        "version-2-content",
      );
    },
  );
});

describe("Concurrent operations", () => {
  s3test(
    "5 concurrent uploads to different keys all succeed",
    async ({ cleanup }) => {
      const keys = Array.from({ length: 5 }, (_, i) =>
        testKey(`concurrent-upload-${i}`),
      );
      keys.forEach((key) => cleanup(key));

      const uploads = keys.map(async (key, i) => {
        const url = await generateUploadUrl(key);
        const res = await fetch(url, {
          method: "PUT",
          body: Buffer.from(`concurrent-content-${i}`),
          headers: { "Content-Type": "application/zip" },
        });
        return res.ok;
      });

      const results = await Promise.all(uploads);
      expect(results).toEqual([true, true, true, true, true]);

      // Verify all downloadable
      const downloads = keys.map(async (key) => {
        const url = await generateDownloadUrl(key);
        const res = await fetch(url);
        return Buffer.from(await res.arrayBuffer()).toString();
      });

      const contents = await Promise.all(downloads);
      contents.forEach((content, i) => {
        expect(content).toBe(`concurrent-content-${i}`);
      });
    },
  );

  s3test(
    "3 concurrent deletes of same key all succeed (idempotency)",
    async () => {
      const key = testKey("concurrent-delete");
      // Upload first
      const url = await generateUploadUrl(key);
      await fetch(url, {
        method: "PUT",
        body: Buffer.from("delete-me"),
        headers: { "Content-Type": "application/zip" },
      });

      // 3 concurrent deletes
      const deletes = Array.from({ length: 3 }, () => deleteObject(key));
      await expect(Promise.all(deletes)).resolves.toBeDefined();
    },
  );
});
