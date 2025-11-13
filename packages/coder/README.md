# Coder SDK

TypeScript SDK for the Coder platform built with [Effect](https://effect.website).

## Features

- **Type-safe**: Full TypeScript support with runtime validation
- **Composable**: Built on Effect for easy composition and error handling
- **Resilient**: Built-in retry logic and timeout handling
- **Extensible**: Modular service-based architecture

## Installation

```bash
pnpm add @package/coder
```

## Quick Start

```typescript
import { makeCoderClient } from "@package/coder"
import { Effect } from "effect"

const program = Effect.gen(function* () {
  const client = yield* makeCoderClient({
    baseUrl: "https://coder.example.com",
    apiToken: process.env.CODER_API_TOKEN!
  })

  const result = yield* client.users.listUsers({ limit: 10 })

  console.log(`Found ${result.count} users`)
  for (const user of result.users) {
    console.log(`- ${user.username} (${user.email})`)
  }
})

Effect.runPromise(program)
```

## Configuration

### Client Options

```typescript
interface CoderClientOptions {
  baseUrl: string      // Coder deployment URL
  apiToken: string     // API authentication token
  timeout?: number     // Request timeout in ms (default: 30000)
  retries?: number     // Number of retries (default: 3)
}
```

## API

### Users Service

#### `listUsers(params?)`

List all users in the Coder deployment.

```typescript
const result = yield* client.users.listUsers({
  q: "search-term",      // Search by username or email
  limit: 25,             // Max results (default: 25, max: 100)
  offset: 0,             // Pagination offset
  status: "active"       // Filter by status
})
```

## Architecture

The SDK is organized into modular services:

```
src/
├── Client.ts              # Main SDK client
├── Config.ts              # Configuration types
├── Errors.ts              # Error definitions
├── HttpClient.ts          # HTTP client service
├── services/              # API endpoint services
│   └── Users.ts          # Users service
└── schemas/               # Request/response schemas
    └── User.ts           # User-related schemas
```

### Adding New Services

To add a new service (e.g., Workspaces):

1. Create schema in `src/schemas/Workspace.ts`
2. Create service in `src/services/Workspaces.ts`
3. Add service to `Client.ts`
4. Export from `src/index.ts`

## Examples

Run the example program:

```bash
CODER_URL=https://coder.example.com CODER_TOKEN=your-token pnpm tsx src/Program.ts
```

See `examples/` directory for more examples.

## Error Handling

The SDK uses Effect's type-safe error handling:

```typescript
import { Effect } from "effect"
import { AuthenticationError, NetworkError } from "@package/coder"

const program = Effect.gen(function* () {
  const client = yield* makeCoderClient({ ... })
  const users = yield* client.users.listUsers()
  return users
}).pipe(
  Effect.catchTag("AuthenticationError", (error) =>
    Effect.fail("Invalid API token")
  ),
  Effect.catchTag("NetworkError", (error) =>
    Effect.fail("Network error occurred")
  )
)
```

## Development

**Build the package:**

```bash
pnpm build
```

**Run tests:**

```bash
pnpm test
```

**Type check:**

```bash
pnpm typecheck
```

**Lint:**

```bash
pnpm lint
```
