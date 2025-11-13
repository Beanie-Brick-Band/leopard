import { Data } from "effect"

/**
 * Configuration error - invalid or missing configuration
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string
}> {}

/**
 * Network error - failed to connect or network issues
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Authentication error - invalid or expired token
 */
export class AuthenticationError extends Data.TaggedError(
  "AuthenticationError"
)<{
  readonly message: string
  readonly statusCode: number
}> {}

/**
 * Authorization error - insufficient permissions
 */
export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  readonly message: string
  readonly statusCode: number
}> {}

/**
 * Not found error - resource not found
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly message: string
  readonly resource: string
}> {}

/**
 * Validation error - invalid request data
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
  readonly details?: unknown
}> {}

/**
 * API error - general API error from Coder
 */
export class CoderApiError extends Data.TaggedError("CoderApiError")<{
  readonly message: string
  readonly statusCode: number
  readonly response?: unknown
}> {}

/**
 * Parse error - failed to parse response
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

/**
 * Union type of all possible SDK errors
 */
export type CoderError =
  | ConfigError
  | NetworkError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | ValidationError
  | CoderApiError
  | ParseError
