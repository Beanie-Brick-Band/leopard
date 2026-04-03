/* eslint-disable */
// @ts-nocheck
// This is an standalone script used to run a sidecar web server for submissions. It's simply put here so we can have a stable link to it.
import { randomUUID } from "node:crypto";
import { unlinkSync } from "node:fs";

const PORT = 13338;
const WORKSPACE_DIR = "/home/coder/workspace";

Bun.serve({
  port: PORT,
  routes: {
    "/health": {
      GET: () => Response.json({ status: "ok" }),
    },
    "/submit": {
      POST: async (req) => {
        const tmpZip = `/tmp/submission-${randomUUID()}.zip`;
        try {
          const body = (await req.json()) as { uploadUrl?: string };
          if (!body.uploadUrl) {
            return Response.json(
              { success: false, error: "Missing uploadUrl" },
              { status: 400 },
            );
          }

          const parsedUrl = URL.parse(body.uploadUrl);
          if (
            parsedUrl?.hostname !== "minio.tryleopard.dev" ||
            parsedUrl.protocol !== "https:"
          ) {
            return Response.json(
              { success: false, error: "Invalid uploadUrl" },
              { status: 400 },
            );
          }

          const result = Bun.spawnSync(
            ["/usr/bin/zip", "-r", tmpZip, ".", "-x", "*/.*", "-x", ".*"],
            {
              cwd: WORKSPACE_DIR,
              timeout: 60_000,
            },
          );

          if (!result.success) {
            const stderr = result.stderr.toString();
            return Response.json(
              { success: false, error: `Zip failed: ${stderr}` },
              { status: 500 },
            );
          }

          const zipData = Bun.file(tmpZip);

          const uploadRes = await fetch(body.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/zip" },
            body: zipData,
          });

          try {
            unlinkSync(tmpZip);
          } catch {}

          if (!uploadRes.ok) {
            return Response.json(
              {
                success: false,
                error: `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`,
              },
              { status: 500 },
            );
          }

          return Response.json({ success: true });
        } catch (err: unknown) {
          try {
            unlinkSync(tmpZip);
          } catch {}
          return Response.json(
            {
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
  fetch() {
    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`Submission sidecar listening on port ${PORT}`);
