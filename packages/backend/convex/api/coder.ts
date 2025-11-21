import {mutation} from "../_generated/server"
import { v } from "convex/values";

// export const updateSessionToken = mutation({
//     args: {
//         workspaceId: v.id("workspaces"),
//         coderSessionId: v.string(), 
//         coderSessionGeneratedTime: v.string()
//     },
//     handler: async (ctx, args) => {
//         const workspace = await ctx.db.get(args.workspaceId);
//         if (!workspace) throw new Error("Workspace not found");
//         await ctx.db.patch(args.workspaceId, {
//             coderSessionId: args.coderSessionId,
//             coderSessionGeneratedTime: args.coderSessionGeneratedTime
//         });
//     },
// });

