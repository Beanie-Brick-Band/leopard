import { env } from "../src/env";

export default {
  providers: [
    {
      domain: env.SITE_URL,
      applicationID: "convex",
    },
  ],
};
