import { unlinkSync } from "node:fs";

const PORT = 13338;
const WORKSPACE_DIR = "/home/coder/workspace";
const TMP_ZIP = "/tmp/submission.zip";

Bun.serve({
  port: PORT,
  routes: {
    "/health": {
      GET: () => Response.json({ status: "ok" }),
    },
    "/submit": {
      POST: async (req) => {
        try {
          const body = (await req.json()) as { uploadUrl?: string };
          if (!body.uploadUrl) {
            return Response.json(
              { success: false, error: "Missing uploadUrl" },
              { status: 400 },
            );
          }

          // Zip workspace, excluding dotfiles/dotfolders
          // Use Bun.spawnSync to call zip directly (no /bin/sh needed)
          const result = Bun.spawnSync(
            ["/usr/bin/zip", "-r", TMP_ZIP, ".", "-x", "*/.*", "-x", ".*"],
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

          const zipData = Bun.file(TMP_ZIP);

          // Upload to presigned URL
          const uploadRes = await fetch(body.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/zip" },
            body: zipData,
          });

          // Cleanup temp file
          try {
            unlinkSync(TMP_ZIP);
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
            unlinkSync(TMP_ZIP);
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
