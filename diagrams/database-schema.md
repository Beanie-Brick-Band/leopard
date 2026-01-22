# Database Schema Diagram

## Application Schema

```mermaid
erDiagram
    assignments ||--o{ classrooms : "is referenced by"
    assignments ||--o{ submissions : "has"

    classrooms ||--o{ classroomStudentsRelations : "has"
    classrooms ||--o{ classrooms : "contains assignments"

    classroomStudentsRelations }o--|| classrooms : "references"

    workspaces ||--o{ submissions : "has"
    workspaces ||--o{ events : "has"

    submissions }o--|| assignments : "references"
    submissions }o--|| workspaces : "references"
    submissions ||--o{ flags : "may have"

    events }o--|| workspaces : "references"

    flags ||--o{ submissions : "can be attached to"

    assignments {
        string id "Primary Key"
        string dueDate
        string name
    }

    classrooms {
        string id "Primary Key"
        array assignments "Foreign Key: assignments"
        string className
        string metadata
        string ownerId "betterAuth user id"
    }

    classroomStudentsRelations {
        string id "Primary Key"
        string classroomId "Foreign Key: classrooms"
        string studentId "betterAuth user id"
    }

    events {
        string id "Primary Key"
        string eventType
        number timestamp
        string workspaceId "Foreign Key: workspaces"
        map metadata "string -> any"
    }

    flags {
        string id "Primary Key"
        string description
        number timestamp
        string type
    }

    submissions {
        string id "Primary Key"
        string assignmentId "Foreign Key: assignments"
        array flags "Foreign Key: flags"
        float64 grade
        string studentId "betterAuth user id"
        boolean submitted
        string workspaceId "Foreign Key: workspaces"
    }

    workspaces {
        string id "Primary Key"
        string coderWorkspaceId
        string userId "betterAuth user id"
    }
```

## Better Auth Schema

```mermaid
erDiagram
    user ||--o{ session : "has many"
    user ||--o{ account : "has many"
    user ||--o{ verification : "has many"
    user ||--o{ twoFactor : "has one"
    user ||--o{ passkey : "has many"
    user ||--o{ oauthAccessToken : "has many"
    user ||--o{ oauthConsent : "has many"

    session }o--|| user : "belongs to"
    account }o--|| user : "belongs to"
    verification }o--|| user : "belongs to"
    twoFactor }o--|| user : "belongs to"
    passkey }o--|| user : "belongs to"
    oauthAccessToken }o--|| user : "belongs to"
    oauthConsent }o--|| user : "belongs to"

    oauthApplication ||--o{ oauthAccessToken : "issues"
    oauthAccessToken }o--|| oauthApplication : "references"

    user {
        string id "Primary Key"
        string name
        string email
        boolean emailVerified
        string image
        number createdAt
        number updatedAt
        string username
        string displayUsername
        string phoneNumber
        boolean phoneNumberVerified
        boolean twoFactorEnabled
        boolean isAnonymous
        string userId "optional"
    }

    session {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string token
        number expiresAt
        number updatedAt
        number createdAt
        string ipAddress
        string userAgent
    }

    account {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string providerId
        string accountId
        string accessToken
        number accessTokenExpiresAt
        string refreshToken
        number refreshTokenExpiresAt
        string idToken
        string password
        string scope
        number createdAt
        number updatedAt
    }

    verification {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string identifier
        string value
        number expiresAt
        number updatedAt
        number createdAt
    }

    twoFactor {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string secret
        string backupCodes
    }

    passkey {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string credentialID
        string publicKey
        string deviceType
        number counter
        boolean backedUp
        string name
        string aaguid
        string transports
        number createdAt
    }

    oauthApplication {
        string id "Primary Key"
        string name
        string clientId
        string clientSecret
        string type
        string redirectURLs
        boolean disabled
        string icon
        string metadata
        number createdAt
        number updatedAt
        string userId "optional"
    }

    oauthAccessToken {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string clientId "Foreign Key: oauthApplication"
        string accessToken
        number accessTokenExpiresAt
        string refreshToken
        number refreshTokenExpiresAt
        string scopes
        number createdAt
        number updatedAt
    }

    oauthConsent {
        string id "Primary Key"
        string userId "Foreign Key: user"
        string clientId "Foreign Key: oauthApplication"
        string scopes
        boolean consentGiven
        number createdAt
        number updatedAt
    }

    jwks {
        string id "Primary Key"
        string publicKey
        string privateKey
        number createdAt
    }

    rateLimit {
        string id "Primary Key"
        string key
        number count
        number lastRequest
    }
```

## Table Descriptions

### Application Tables

#### assignments

Stores assignment information including due dates and names.

#### classrooms

Represents classroom entities with references to assignments and an owner.

#### classroomStudentsRelations

Many-to-many relationship table linking classrooms to students.

#### events

Tracks events with timestamps, associated with specific workspaces.

#### flags

Stores flag information that can be attached to submissions.

#### submissions

Contains assignment submission data including grades, status, and workspace references.

#### workspaces

Maps coder workspaces to users.

### Better Auth Tables

#### user

Core user table storing authentication and profile information. The `id` field is referenced throughout the application schema as "betterAuth user id".

#### session

Manages user sessions with token-based authentication, including IP address and user agent tracking.

#### account

Stores OAuth provider account information, linking external auth providers (Google, GitHub, etc.) to local users.

#### verification

Stores verification tokens for email verification and other verification processes.

#### twoFactor

Contains two-factor authentication secrets and backup codes for users with 2FA enabled.

#### passkey

Stores WebAuthn passkey credentials for passwordless authentication.

#### oauthApplication

Defines OAuth applications that can be registered with the system.

#### oauthAccessToken

Manages OAuth access tokens for applications.

#### oauthConsent

Tracks user consent for OAuth applications to access their data.

#### jwks

Stores public/private key pairs for JWT signing.

#### rateLimit

Implements rate limiting by tracking request counts per key.

## Cross-Reference Notes

The application schema references Better Auth users via:

- `classrooms.ownerId` → `user.id`
- `classroomStudentsRelations.studentId` → `user.id`
- `submissions.studentId` → `user.id`
- `workspaces.userId` → `user.id`
