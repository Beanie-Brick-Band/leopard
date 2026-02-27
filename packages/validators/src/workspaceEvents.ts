/**
 * Module for validating database queries on workspace events.
 */

import { z } from "zod";

export const NAME = {
  DID_CHANGE_TEXT_DOCUMENT: "DID_CHANGE_TEXT_DOCUMENT",
  DID_RENAME_FILES: "DID_RENAME_FILES",
} as const;

const Event = z.object({
  timestamp: z.number(),
  workspaceId: z.string(),
});

const DidChangeTextDocument = Event.extend({
  eventType: z.literal(NAME.DID_CHANGE_TEXT_DOCUMENT),
  metadata: z.object({
    contentChanges: z.array(
      z.object({
        range: z.object({
          start: z.object({
            line: z.number(),
            column: z.number(),
          }),
          end: z.object({
            line: z.number(),
            column: z.number(),
          }),
        }),
        text: z.string(),
        filePath: z.string(),
      }),
    ),
  }),
});

const DidRenameFiles = Event.extend({
  eventType: z.literal(NAME.DID_RENAME_FILES),
  metadata: z.object({
    renamedFiles: z.array(
      z.object({
        oldFilePath: z.string(),
        newFilePath: z.string(),
      }),
    ),
  }),
});

export const WorkspaceEvent = z.discriminatedUnion("eventType", [
  DidChangeTextDocument,
  DidRenameFiles,
]);
