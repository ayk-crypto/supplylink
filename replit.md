# SupplyLink

Production SaaS app with a React + Vite frontend and an Express + PostgreSQL backend, organized as an npm workspaces monorepo.

## Current branch

This Replit workspace is checked out on **`backend-foundation`**, tracking `origin/backend-foundation` (`https://github.com/ayk-crypto/supplylink`). The legacy starter scaffold from `main` is no longer used.

## Architecture

- **Frontend**: React + Vite (dev server on port `5000`, `strictPort: true`, proxies `/api` → `:4000`)
- **Backend**: Express + PostgreSQL (dev server on port `4000`, versioned routes under `/api/v1/*`)
- **Database**: Neon Postgres via `NEON_DATABASE_URL` (Replit reserves `DATABASE_URL`)
- **Package manager**: npm workspaces

## Top-level structure

```
.
├── client/
│   └── src/
│       ├── app/           # App shell, routes, browser-route hook
│       ├── components/    # layout/, ui/, dashboard/
│       ├── config/        # env.js
│       ├── features/      # audit, auth, dashboard, feedback, inventory,
│       │                  # invoices, ledger, master-data, notifications,
│       │                  # reports, system, transactions
│       ├── services/      # httpClient.js, queryString.js, plus per-domain
│       │                  # API helpers (auditApi.js, inventoryApi.js, ...)
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
└── server/
    └── src/
        ├── api/v1/routes/         # versioned route index
        ├── config/
        ├── core/                  # constants, errors, http helpers
        ├── database/
        ├── middlewares/
        ├── modules/               # auth, customers, vendors, products,
        │                          # orders, quotations, invoices, ledger,
        │                          # reports, notifications, files,
        │                          # documents, lookups, subscriptions,
        │                          # system, ui, routes, audit, inventory
        ├── test/
        ├── utils/
        ├── app.js
        └── server.js
```

## Modules delivered (frontend)

- 20L Notifications / Activity Center
- 20M Visual polish
- 20N Inter typography
- Responsive hardening
- 20O Inventory screens
- 20Q Dashboard intelligence (aggregates-driven)
- 20T Audit / Activity history (`/audit`, `/audit/:entityType/:entityId`)

## Development

```
npm run dev
```

- Frontend: http://localhost:5000
- Backend API: http://localhost:4000

## Environment variables

- `PORT` — Backend server port (default 4000 in development)
- `NEON_DATABASE_URL` — Postgres connection string (Neon)

## Database

Run migrations with:

```
npm run db:migrate --workspace server
```

## Deployment

Configured for autoscale deployment:
- **Build**: `npm run build` (builds client, validates server)
- **Run**: `npm run start --workspace server` (production Express server)
