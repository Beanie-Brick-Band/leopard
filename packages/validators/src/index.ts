import { z } from "zod/v4";

export const unused = z.string().describe(
  `This lib is currently not used as we use drizzle-zod for simple schemas
   But as your application grows and you need other validators to share
   with back and frontend, you can put them in here
  `,
);

export const workspaceEventName = z.enum([
  "DID_OPEN_TEXT_DOCUMENT",
  "DID_CLOSE_TEXT_DOCUMENT",
  "DID_CREATE_FILES",
  "DID_DELETE_FILES",
  "DID_RENAME_FILES",
  "DID_CHANGE_FILES",
  "DID_SAVE_TEXT_DOCUMENT",
  "DID_CHANGE_TEXT_DOCUMENT",
  "DID_CHANGE_TEXT_EDITOR_SELECTION",
  "DID_CHANGE_TERMINAL_STATE",
  "DID_END_TERMINAL_SHELL_EXECUTION",
]);

export type WorkspaceEventName = z.infer<typeof workspaceEventName>;
