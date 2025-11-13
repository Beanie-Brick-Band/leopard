import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Context, Effect, Layer } from "effect"

import { CoderConfigService } from "./Config.js"

/**
 * Tag for the Coder HTTP client service
 */
export class CoderHttpClient extends Context.Tag("CoderHttpClient")<
  CoderHttpClient,
  HttpClient.HttpClient
>() {}

/**
 * Creates a configured HTTP client layer with authentication
 */
export const CoderHttpClientLive = Layer.effect(
  CoderHttpClient,
  Effect.gen(function*() {
    const config = yield* CoderConfigService
    const client = yield* HttpClient.HttpClient

    return client.pipe(
      HttpClient.mapRequest((req) =>
        req.pipe(
          HttpClientRequest.prependUrl(`${config.baseUrl}/api/v2`),
          HttpClientRequest.setHeader("Coder-Session-Token", config.apiToken),
          HttpClientRequest.setHeader("Content-Type", "application/json"),
          HttpClientRequest.setHeader("Accept", "application/json")
        )
      )
    )
  })
)
