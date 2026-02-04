import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extract } from "tar";

import {
  getAllTemplates,
  getFileById,
  getTemplateVersionById,
} from "@package/coder-sdk";
import { createClient } from "@package/coder-sdk/client";

import { env } from "./env";

const ROOT_DIR = resolve(import.meta.dirname, "../../..");
const TEMPLATES_DIR = join(ROOT_DIR, "infra", "coder-templates");

async function syncTemplates() {
  console.log("Starting Coder template sync...\n");

  const coderClient = createClient({
    baseUrl: `${env.CODER_URL}/api/v2`,
    auth: env.CODER_API_KEY,
  });

  console.log("Fetching templates from Coder...");
  const templatesResp = await getAllTemplates({ client: coderClient });

  if (templatesResp.error) {
    console.error("Failed to fetch templates:", templatesResp.error);
    process.exit(1);
  }

  const templates = templatesResp.data ?? [];
  console.log(`Found ${templates.length} template(s)\n`);

  if (templates.length === 0) {
    console.log("No templates found. Nothing to sync.");
    return;
  }

  if (!existsSync(TEMPLATES_DIR)) {
    mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  for (const template of templates) {
    if (!template.id || !template.name || !template.active_version_id) {
      console.log(`Skipping template: missing required fields`);
      continue;
    }

    console.log(
      `Processing template: ${template.display_name ?? template.name}`,
    );

    // Get most update to date version of the template
    const versionResp = await getTemplateVersionById({
      client: coderClient,
      path: { templateversion: template.active_version_id },
    });

    if (versionResp.error || !versionResp.data) {
      console.error(
        `  Failed to fetch version for template ${template.name}:`,
        versionResp.error,
      );
      continue;
    }

    const version = versionResp.data;
    const fileId = version.job?.file_id;

    if (!fileId) {
      console.error(`  No file_id found for template ${template.name}`);
      continue;
    }

    console.log(`  Active version: ${version.name ?? version.id}`);
    console.log(`  File ID: ${fileId}`);

    const fileResp = await getFileById({
      client: coderClient,
      path: { fileID: fileId },
      parseAs: "blob",
    });

    if (fileResp.error || !fileResp.data) {
      console.error(
        `  Failed to download template file for ${template.name}:`,
        fileResp.error,
      );
      continue;
    }

    const templateDir = join(TEMPLATES_DIR, template.name);

    if (existsSync(templateDir)) {
      rmSync(templateDir, { recursive: true });
    }
    mkdirSync(templateDir, { recursive: true });

    // Extract .tf files from the tar archive
    try {
      const blob = fileResp.data as Blob;
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const readable = Readable.from(buffer);

      await pipeline(
        readable,
        extract({
          cwd: templateDir,
          filter: (path) => path.endsWith(".tf"),
          strip: 0, // Don't strip leading directories
        }),
      );

      console.log(`  Extracted .tf files to: ${templateDir}`);
    } catch (err) {
      console.error(`  Failed to extract template ${template.name}:`, err);
      continue;
    }
  }

  console.log("\nTemplate sync complete!");
  console.log(`Templates saved to: ${TEMPLATES_DIR}`);
}

syncTemplates().catch((err) => {
  console.error("Fatal error during sync:", err);
  process.exit(1);
});
