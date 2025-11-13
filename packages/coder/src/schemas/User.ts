import { Schema } from "effect"

/**
 * Schema for a role assigned to a user
 */
export class Role extends Schema.Class<Role>("Role")({
  display_name: Schema.String,
  name: Schema.String,
  organization_id: Schema.NullOr(Schema.String)
}) {}

/**
 * Schema for a Coder user
 */
export class User extends Schema.Class<User>("User")({
  id: Schema.String,
  username: Schema.String,
  email: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
  last_seen_at: Schema.String,
  status: Schema.String,
  name: Schema.String,
  avatar_url: Schema.String,
  organization_ids: Schema.Array(Schema.String),
  roles: Schema.Array(Role),
  login_type: Schema.String,
  theme_preference: Schema.String
}) {}

/**
 * Schema for the list users response
 */
export class GetUsersResponse extends Schema.Class<GetUsersResponse>(
  "GetUsersResponse"
)({
  count: Schema.Number.pipe(Schema.int()),
  users: Schema.Array(User)
}) {}

/**
 * Schema for list users query parameters
 */
export class ListUsersParams extends Schema.Class<ListUsersParams>(
  "ListUsersParams"
)({
  /**
   * Search query to filter users by username or email
   */
  q: Schema.optional(Schema.String),
  /**
   * Maximum number of users to return (default: 25, max: 100)
   */
  limit: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
  /**
   * Number of users to skip for pagination
   */
  offset: Schema.optional(
    Schema.Number.pipe(Schema.int(), Schema.nonNegative())
  ),
  /**
   * Filter by user status (e.g., "active", "suspended")
   */
  status: Schema.optional(Schema.String)
}) {}
