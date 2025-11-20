import type { CreateAuth } from "@convex-dev/better-auth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";

import type { DataModel } from "@package/backend/convex/_generated/dataModel";
import { createAuth } from "@package/backend/convex/auth";

export const getToken = () => {
  // TODO: Investigate why CreateAuth<DataModel> is not being inferred correctly
  return getTokenNextjs(createAuth as unknown as CreateAuth<DataModel>);
};
