import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";

import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

if (!process.env.WEB_DEPLOYMENT_URL) {
  throw new Error("WEB_DEPLOYMENT_URL is not set");
}

const siteUrl = new URL(process.env.WEB_DEPLOYMENT_URL!);
const siteDomainWithoutProtocol = siteUrl.hostname;

const trustedOrigins = [
  siteDomainWithoutProtocol,
  `*.${siteDomainWithoutProtocol}`,
];

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    // disable logging when createAuth is called just to generate options.
    // this is not required, but there's a lot of noise in logs without it.
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl.toString(),
    database: authComponent.adapter(ctx),
    // Configure simple, non-verified email/password to get started
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      // The Convex plugin is required for Convex compatibility
      convex(),
    ],
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: siteUrl.hostname,
      },
    },
    trustedOrigins: trustedOrigins,
  });
};

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
