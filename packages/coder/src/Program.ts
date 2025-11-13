/**
 * Example program demonstrating the Coder SDK
 *
 * Set environment variables:
 *   CODER_URL=https://coder.example.com
 *   CODER_TOKEN=your-api-token
 *
 * Then run:
 *   pnpm tsx src/Program.ts
 */

import { Effect } from "effect";

import { makeCoderClient } from "./index.js";

const program = Effect.gen(function* () {
  const baseUrl = process.env.CODER_URL;
  const apiToken = process.env.CODER_TOKEN;

  if (!baseUrl || !apiToken) {
    console.log("Please set CODER_URL and CODER_TOKEN environment variables");
    console.log("Example:");
    console.log(
      "  CODER_URL=https://coder.example.com CODER_TOKEN=your-token pnpm tsx src/Program.ts",
    );
    return;
  }

  console.log(`Connecting to Coder at ${baseUrl}...`);

  const client = yield* makeCoderClient({
    baseUrl,
    apiToken,
  });

  const result = yield* client.users.listUsers({ limit: 5 });

  console.log(`\nFound ${result.count} total users`);
  console.log(`\nShowing first ${result.users.length} users:\n`);

  for (const user of result.users) {
    console.log(`${user.username} (${user.email}) - ${user.status}`);
  }
});

Effect.runPromise(program).catch(console.error);
