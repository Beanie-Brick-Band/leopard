/**
 * Example: List all users in a Coder deployment
 *
 * Usage:
 *   CODER_URL=https://coder.example.com CODER_TOKEN=your-token tsx examples/list-users.ts
 */

import { Effect } from "effect"
import { makeCoderClient } from "../src/index.js"

const program = Effect.gen(function*() {
  // Get configuration from environment variables
  const baseUrl = process.env.CODER_URL
  const apiToken = process.env.CODER_TOKEN

  if (!baseUrl || !apiToken) {
    yield* Effect.fail(
      new Error("Please set CODER_URL and CODER_TOKEN environment variables")
    )
  }

  console.log(`Connecting to Coder at ${baseUrl}...`)

  // Create the Coder client
  const client = yield* makeCoderClient({
    baseUrl,
    apiToken
  })

  // List all users with pagination
  console.log("\nFetching users...\n")
  const result = yield* client.users.listUsers({
    limit: 100
  })

  console.log(`Total users: ${result.count}\n`)

  // Display user information
  for (const user of result.users) {
    console.log(`User: ${user.username}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Status: ${user.status}`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Created: ${user.created_at}`)
    console.log(`  Last seen: ${user.last_seen_at}`)
    console.log(`  Roles: ${user.roles.map((r) => r.display_name).join(", ")}`)
    console.log()
  }
}).pipe(
  Effect.catchAll((error) =>
    Effect.sync(() => {
      console.error("Error:", error)
      process.exit(1)
    })
  )
)

Effect.runPromise(program)
