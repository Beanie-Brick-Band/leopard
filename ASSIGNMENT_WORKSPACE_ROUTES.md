# Assignment & Workspace Management Routes

---

## assignment.getById

| Detail                  | Description                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Route**               | `assignment.getById`                                                                                                                                            |
| **Implementation**      | Simple database get after authentication check.                                                                                                                 |
| **API Input**           | `{ id: Id<"assignments"> }`                                                                                                                                     |
| **API Output**          | `{ _id: Id<"assignments">, classroomId: Id<"classrooms">, name: string, description: string, dueDate: string, templateId?: string, createdAt: number } \| null` |
| **Normal Behaviour**    | Retrieves a single assignment by ID.                                                                                                                            |
| **Undesired Behaviour** | No authorization check; any authenticated user can view any assignment.                                                                                         |

---

## assignment.getByIds

| Detail                  | Description                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Route**               | `assignment.getByIds`                                                                                                                                                                  |
| **Implementation**      | Parallel fetches all IDs and filters nulls.                                                                                                                                            |
| **API Input**           | `{ ids: Array<Id<"assignments">> }`                                                                                                                                                    |
| **API Output**          | `Array<{ _id: Id<"assignments">, classroomId: Id<"classrooms">, name: string, description: string, dueDate: string, templateId?: string, createdAt: number }>` (Null entries filtered) |
| **Normal Behaviour**    | Retrieves multiple assignments by their IDs.                                                                                                                                           |
| **Undesired Behaviour** | No authorization check; any authenticated user can batch-query any assignments.                                                                                                        |

---

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

## assignment.setUserActiveWorkspace [Internal]

| Detail                  | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Route**               | `assignment.setUserActiveWorkspace` (Internal Mutation)                                 |
| **Implementation**      | Deletes all existing workspace records for user except current one, inserts new record. |
| **API Input**           | `{ userId: string, coderWorkspaceId: string, assignmentId?: Id<"assignments"> }`        |
| **API Output**          | `void` (No return value)                                                                |
| **Normal Behaviour**    | Sets the user's active workspace, deleting previous active workspace records.           |
| **Undesired Behaviour** | Not atomic; could leave user with no active workspace if insert fails after deletes.    |

---

## assignment.getUserActiveWorkspace [Internal]

| Detail                  | Description                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Route**               | `assignment.getUserActiveWorkspace` (Internal Query)                                                                               |
| **Implementation**      | Simple query filter by userId returning first match.                                                                               |
| **API Input**           | `{ userId: string }`                                                                                                               |
| **API Output**          | `{ _id: Id<"workspaces">, userId: string, coderWorkspaceId: string, assignmentId?: Id<"assignments">, createdAt: number } \| null` |
| **Normal Behaviour**    | Retrieves the user's current active workspace.                                                                                     |
| **Undesired Behaviour** | Returns first if multiple exist (shouldn't happen but not prevented).                                                              |

---

_Documentation for Assignment & Workspace Management Routes_
