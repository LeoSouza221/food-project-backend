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
- [ ] PostgreSQL persistence.
- [ ] User registration and authentication.
- [ ] Category creation and management.

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
- PostgreSQL (planned)
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
```

The structure will expand as new responsibilities and features are implemented.

## Status

This project is under active development, with a focus on hands-on learning and the incremental evolution of backend architecture.

## License

Not yet defined.
