# Food Project Backend

Backend for a standalone food ordering platform, developed as a hands-on project to learn Node.js and TypeScript.

The goal is to build the application incrementally, applying backend architecture concepts, data validation, automated testing, and data persistence.

## Project Goals

- Build an HTTP API using Node.js and TypeScript.
- Organize the code into routes, controllers, services, and repositories.
- Implement product creation, retrieval, and update operations.
- Validate incoming API data.
- Write automated tests for business rules and controllers.
- Evolve the application to use PostgreSQL and authentication.
- Prepare the foundation for future user, cart, and order management features.

## Scope

### V1 — Catalog and Users

- [x] Initial HTTP API structure.
- [x] Routes for product operations.
- [x] Input data validation.
- [x] Separation of routes, controllers, services, and repositories.
- [x] Automated tests for the current implementation.
- [x] PostgreSQL persistence.
- [ ] User registration and authentication.
- [x] Category creation and management.

### V2 — Cart and Orders

- [ ] Shopping cart.
- [ ] Order creation and management.
- [ ] Order history and tracking.

## Technologies

- Node.js
- TypeScript
- Node.js native HTTP module
- Vitest
- ESLint
- Prettier
- PostgreSQL
- Docker (planned)

## Prerequisites

- Node.js and npm installed.
- Git installed.

## Getting Started

Clone the repository and navigate to the project directory:

```bash
git clone git@github-pessoal:LeoSouza221/food-project-backend.git
cd food-project-backend
```

Install the dependencies:

```bash
npm install
```

Start the development server using the script configured in the project:

```bash
npm run dev
```

> Check the available scripts in `package.json` if the commands above differ from your current configuration.

## Tests

Run the automated test suite:

```bash
npm test
```

## Project Structure

```text
src/
├── app.ts
├── server.ts
├── routes/
├── controllers/
├── services/
└── repositories/
tests/
├── products.integration.test.ts
└── categories.integration.test.ts
```

Unit tests remain next to their source files; HTTP integration tests live in `tests/`.

## Route authentication

`requireAuth(req, res)` authenticates a request and returns it with its `auth` context.
Pass an array of allowed roles as the third argument to additionally enforce authorization,
for example `requireAuth(req, res, ['admin'])`. If it returns `null`, stop processing: the
middleware has already sent a 401 or 403 response. An empty role array denies every role.
Validate the route shape before applying the protection.

## Refresh token helpers

`generateRefreshToken()` creates a URL-safe token from 32 cryptographically secure random bytes.
Use `hashRefreshToken(token)` to obtain its SHA-256 hash as hexadecimal text for
`sessions.refresh_token_hash`; store only the hash, not the original token.
These helpers do not create or manage sessions.

## Session repository

`saveSessionRepository` stores a session using a caller-supplied UUID and refresh token hash.
`findSessionByRefreshTokenHashRepository` finds a session by its hash, including expired and
revoked sessions; callers must check `expiresAt` and `revokedAt` before accepting it.
`revokeSessionRepository` sets `revokedAt` once and returns `null` if the session does not
exist or was already revoked. These operations are not yet connected to login or HTTP routes.

## Status

This project is under active development, with a focus on hands-on learning and the incremental evolution of backend architecture.

## License

Not yet defined.

## Database migrations

Database schema changes are managed through versioned SQL migrations.

Migrations are stored in `src/database/migrations` and executed in ascending order. The `schema_migrations` table tracks which migrations have already been applied.

Run pending migrations:

```bash
npm run db:migrate
```

Each migration runs inside a database transaction. A PostgreSQL advisory lock prevents concurrent migration runners from applying changes simultaneously.

**Important:** Applied migration files should not be modified. Create a new migration for subsequent schema changes.

## Authentication and sessions

Authentication uses short-lived JWT access tokens and opaque refresh tokens.

Refresh tokens are generated using cryptographically secure random bytes. Only their SHA-256 hashes are stored in PostgreSQL.

Sessions support token rotation, expiration, and revocation. Refresh token rotation is performed atomically to prevent concurrent reuse of the same token.
