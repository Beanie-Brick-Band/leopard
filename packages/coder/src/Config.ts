import { Context, Data } from "effect"

/**
 * Configuration for the Coder SDK client
 */
export class CoderConfig extends Data.Class<{
  /**
   * The base URL of the Coder deployment (e.g., "https://coder.example.com")
   */
  readonly baseUrl: string

  /**
   * API token for authentication
   */
  readonly apiToken: string

  /**
   * Optional timeout in milliseconds for HTTP requests (default: 30000)
   */
  readonly timeout?: number

  /**
   * Optional number of retries for failed requests (default: 3)
   */
  readonly retries?: number
}> {}

/**
 * Context tag for CoderConfig
 */
export class CoderConfigService extends Context.Tag("CoderConfig")<
  CoderConfigService,
  CoderConfig
>() {}
