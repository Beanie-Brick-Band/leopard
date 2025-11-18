Convex is hosted on two different types of URLs:

- CONVEX_URL (e.g. abcd.convex.cloud) - The main URL for Convex queries and mutations.
- CONVEX_SITE_URL (e.g. abcd.convex.site) - The URL for [HTTP Actions](https://docs.convex.dev/functions/http-actions) on Convex.

**Why do we need both?**

While we are using Convex for our application, the authentication is provided by the [better-auth](https://www.better-auth.com/) package. better-auth is hosted through the HTTP Actions feature of Convex, which requires a separate URL (CONVEX_SITE_URL) to function properly.
