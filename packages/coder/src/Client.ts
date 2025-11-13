import { NodeHttpClient } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { CoderConfig, CoderConfigService } from "./Config.js"
import { CoderHttpClientLive } from "./HttpClient.js"
import { UsersService, UsersServiceLive } from "./services/Users.js"

/**
 * Configuration options for creating a Coder client
 */
export interface CoderClientOptions {
  /**
   * The base URL of the Coder deployment (e.g., "https://coder.example.com")
   */
  baseUrl: string

  /**
   * API token for authentication
   */
  apiToken: string

  /**
   * Optional timeout in milliseconds for HTTP requests (default: 30000)
   */
  timeout?: number

  /**
   * Optional number of retries for failed requests (default: 3)
   */
  retries?: number
}

/**
 * Creates a layer containing all Coder SDK services
 */
export const makeCoderLayer = (options: CoderClientOptions) => {
  const configLayer = Layer.succeed(
    CoderConfigService,
    new CoderConfig({
      baseUrl: options.baseUrl,
      apiToken: options.apiToken,
      ...(options.timeout !== undefined && { timeout: options.timeout }),
      ...(options.retries !== undefined && { retries: options.retries })
    })
  )

  return Layer.provideMerge(
    UsersServiceLive,
    Layer.provideMerge(CoderHttpClientLive, configLayer)
  ).pipe(Layer.provide(NodeHttpClient.layerUndici))
}

/**
 * Creates a Coder SDK client with the specified configuration
 *
 * @example
 * ```typescript
 * import { makeCoderClient } from "@package/coder"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const client = yield* makeCoderClient({
 *     baseUrl: "https://coder.example.com",
 *     apiToken: "your-api-token"
 *   })
 *
 *   const users = yield* client.users.listUsers()
 *   console.log(`Found ${users.count} users`)
 * })
 * ```
 */
export const makeCoderClient = (options: CoderClientOptions) => {
  const layer = makeCoderLayer(options)

  return Effect.gen(function*() {
    const users = yield* UsersService

    return {
      users
    }
  }).pipe(Effect.provide(layer))
}

/**
 * Type of the Coder SDK client
 */
export type CoderClient = Effect.Effect.Success<ReturnType<typeof makeCoderClient>>
