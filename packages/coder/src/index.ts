/**
 * Coder SDK - TypeScript SDK for the Coder platform built with Effect
 *
 * @example
 * ```typescript
 * import { makeCoderClient } from "@package/coder"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* makeCoderClient({
 *     baseUrl: "https://coder.example.com",
 *     apiToken: process.env.CODER_API_TOKEN!
 *   })
 *
 *   const result = yield* client.users.listUsers({ limit: 10 })
 *   console.log(`Found ${result.count} users`)
 *
 *   for (const user of result.users) {
 *     console.log(`- ${user.username} (${user.email})`)
 *   }
 * })
 *
 * Effect.runPromise(program)
 * ```
 *
 * @packageDocumentation
 */

export { makeCoderClient, makeCoderLayer } from "./Client.js"
export type { CoderClient, CoderClientOptions } from "./Client.js"

export { CoderConfig, CoderConfigService } from "./Config.js"

export * from "./Errors.js"

export { UsersService, UsersServiceLive } from "./services/Users.js"

export * from "./schemas/User.js"

export { CoderHttpClient, CoderHttpClientLive } from "./HttpClient.js"
