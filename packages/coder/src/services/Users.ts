import type * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import { Context, Effect, Layer, Schema } from "effect"

import { ParseError } from "../Errors.js"
import { CoderHttpClient } from "../HttpClient.js"
import type { ListUsersParams } from "../schemas/User.js"
import { GetUsersResponse } from "../schemas/User.js"

/**
 * Service for managing Coder users
 */
export class UsersService extends Context.Tag("UsersService")<
  UsersService,
  {
    /**
     * List all users in the Coder deployment
     *
     * @param params Optional query parameters for filtering and pagination
     * @returns Effect that resolves to the list of users
     */
    readonly listUsers: (
      params?: typeof ListUsersParams.Type
    ) => Effect.Effect<
      typeof GetUsersResponse.Type,
      ParseError | HttpClientError.HttpClientError
    >
  }
>() {}

/**
 * Live implementation of the Users service
 */
export const UsersServiceLive = Layer.effect(
  UsersService,
  Effect.gen(function*() {
    const httpClient = yield* CoderHttpClient

    return {
      listUsers: (params) =>
        Effect.gen(function*() {
          let request = HttpClientRequest.get("/users")

          if (params) {
            if (params.q !== undefined) {
              request = HttpClientRequest.setUrlParam(request, "q", params.q)
            }
            if (params.limit !== undefined) {
              request = HttpClientRequest.setUrlParam(
                request,
                "limit",
                params.limit.toString()
              )
            }
            if (params.offset !== undefined) {
              request = HttpClientRequest.setUrlParam(
                request,
                "offset",
                params.offset.toString()
              )
            }
            if (params.status !== undefined) {
              request = HttpClientRequest.setUrlParam(
                request,
                "status",
                params.status
              )
            }
          }

          const response = yield* httpClient.execute(request)
          const json = yield* response.json
          const decoded = yield* Schema.decodeUnknown(GetUsersResponse)(
            json
          ).pipe(
            Effect.mapError(
              (error) =>
                new ParseError({
                  message: "Failed to parse users response",
                  cause: error
                })
            )
          )

          return decoded
        })
    }
  })
)
