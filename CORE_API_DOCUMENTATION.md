# Leopard API Documentation

Critical API routes for core functionality.

---

# Launch Workspace for Coding

## assignment.launchWorkspace

| Detail                  | Description                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Route**               | `assignment.launchWorkspace`                                                                                                |
| **Implementation**      | Creates/fetches Coder user, gets/creates workspace, stops other workspaces, generates session key, stores active workspace. |
| **API Input**           | `{ assignmentId: Id<"assignments"> }`                                                                                       |
| **API Output**          | `{ workspaceUrl: string, coderUserSessionKey: string }`                                                                     |
| **Normal Behaviour**    | Launches or resumes a Coder workspace for the assignment, creating Coder user if needed.                                    |
| **Undesired Behaviour** | Stops ALL other workspaces for user; could disrupt work on other assignments.                                               |

---

# VS Code Extension Event Ingestion

## extension.addBatchedChangesMutation

| Detail                  | Description                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| **Route**               | `extension.addBatchedChangesMutation`                                                                    |
| **Implementation**      | Loops through changes and inserts each as event record with hardcoded workspaceId.                       |
| **API Input**           | `{ changes: Array<{ eventType: string, timestamp: number, metadata: Record<string, any> }> }`            |
| **API Output**          | `void` (No return value, insertedIds computed but not returned)                                          |
| **Normal Behaviour**    | Batch inserts events from VS Code extension for workspace activity tracking.                             |
| **Undesired Behaviour** | Authentication commented out; anyone can insert events; hardcoded workspaceId instead of dynamic lookup. |

---

# Replay Analytics

## replay.getReplays

| Detail                  | Description                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Route**               | `replay.getReplays`                                                                                        |
| **Implementation**      | Fetches all events, groups by workspaceId, sorts metadata by timestamp.                                    |
| **API Input**           | `{}` (No arguments)                                                                                        |
| **API Output**          | `Record<Id<"workspaces">, Array<Record<string, any>>>` (Events bucketed by workspace, sorted by timestamp) |
| **Normal Behaviour**    | Retrieves all events grouped by workspace ID for replay/analysis.                                          |
| **Undesired Behaviour** | Authentication commented out; no filtering by user; returns ALL events for ALL workspaces; no pagination.  |

---

_Core API Documentation - Critical Routes Only_
