/**
 * Module for validating database queries on workspace events.
 */

import { z } from "zod";

export const NAMES = ["DID_CHANGE_TEXT_DOCUMENT"] as const;

export const NAME = NAMES.reduce(
  (acc, name) => {
    acc[name] = name;
    return acc;
  },
  {} as Record<(typeof NAMES)[number], (typeof NAMES)[number]>,
);

const Event = z.object({
  timestamp: z.number(),
  workspaceId: z.string(),
});

export const DidChangeTextDocument = Event.extend({
  eventType: z.literal("DID_CHANGE_TEXT_DOCUMENT"),
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

export type DidChangeTextDocument = z.infer<typeof DidChangeTextDocument>;
