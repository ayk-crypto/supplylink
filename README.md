# SupplyLink

SupplyLink is a production-ready SaaS starter built with a React frontend,
an Express backend, and PostgreSQL integration scaffolding.

## Structure

```text
.
|-- client/   # React app powered by Vite
|-- server/   # Express API with PostgreSQL connection support
|-- docs/     # Project notes and planning
|-- .env.example
`-- package.json
```

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   copy .env.example .env.development
   ```

   Create `.env.production` separately with your production values.

3. Start the client and server together:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` starts both workspaces in development mode.
- `npm run build` builds the frontend and validates the server build step.
- `npm run lint` runs ESLint in both workspaces.
- `npm run start` starts the Express server.

## Initial Example

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- API status endpoint: `http://localhost:4000/api/status`

The React app calls the Express API on load and displays the current backend
and database status.
