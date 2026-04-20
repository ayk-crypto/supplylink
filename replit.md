# SupplyLink

<<<<<<< HEAD
A production-ready SaaS starter application with a decoupled React frontend and Express backend, organized as an npm monorepo.

## Architecture

- **Frontend**: React 19 + Vite (port 5000 in development)
- **Backend**: Express 5 + PostgreSQL (port 4000 in development)
- **Package Manager**: npm workspaces

## Project Structure

```
.
├── client/           # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── services/     # API interaction (api.js)
│   │   ├── styles/       # CSS files
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── vite.config.js    # Vite config (port 5000, proxy to :4000)
├── server/           # Express backend
│   ├── src/
│   │   ├── config/       # DB and env configuration
│   │   ├── controllers/  # Route handlers (health, db)
│   │   ├── middlewares/  # Error handling, 404
│   │   ├── routes/       # API routes (/api/health, /api/db-test)
│   │   └── server.js     # Entry point
│   └── .env.development  # Dev environment (PORT=4000)
└── package.json      # Root workspace config
```

## Development

Run both services simultaneously:
=======
Production SaaS app with a React + Vite frontend and an Express + PostgreSQL backend, organized as an npm workspaces monorepo.

## Current branch

This Replit workspace is checked out on **`backend-foundation`**, tracking `origin/backend-foundation` (`https://github.com/ayk-crypto/supplylink`). The legacy starter scaffold from `main` is no longer used.

## Architecture

- **Frontend**: React + Vite (dev server on port `5173`)
- **Backend**: Express + PostgreSQL (dev server on port `4000`)
- **Package manager**: npm workspaces

## Top-level structure (synced)

```
.
├── client/
│   └── src/
│       ├── app/           # App shell, routes, browser-route hook
│       ├── components/    # layout/, ui/, dashboard/
│       ├── config/        # env.js
│       ├── features/      # auth, dashboard, feedback, invoices, ledger,
│       │                  # master-data, reports, system, transactions
│       ├── services/      # api.js, httpClient.js, authApi.js,
│       │                  # invoiceApi.js, ledgerApi.js, dashboardApi.js,
│       │                  # masterDataApi.js, reportApi.js, systemApi.js,
│       │                  # transactionApi.js, queryString.js
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
└── server/
    └── src/
        ├── api/v1/routes/         # versioned route index
        ├── config/
        ├── controllers/
        ├── core/                  # constants, errors, http helpers
        ├── database/
        ├── middlewares/
        ├── modules/               # auth, customers, vendors, products,
        │                          # orders, quotations, invoices, ledger,
        │                          # reports, notifications, files,
        │                          # documents, lookups, subscriptions,
        │                          # system, ui, routes
        ├── routes/                # legacy db/health routes
        ├── test/
        ├── utils/
        ├── app.js
        └── server.js
```

## Notifications backend (already present)

`server/src/modules/notifications/` contains `notifications.controller.js`, `notifications.routes.js`, `notifications.repository.js`, `notifications.service.js`, and `notifications.schemas.js`. These are the existing backend endpoints to consume from the frontend — do not modify them.

## Development

>>>>>>> 739da302a8f24781514738fa22ca63638c3f6011
```
npm run dev
```

<<<<<<< HEAD
- Frontend: http://localhost:5000
- Backend API: http://localhost:4000

## API Routes

- `GET /api/health` - Server health check
- `GET /api/db-test` - Database connectivity test

## Environment Variables

- `PORT` - Backend server port (default: 4000 in development, 5000 in production)
- `DATABASE_URL` - PostgreSQL connection string

## Deployment

Configured for autoscale deployment:
- **Build**: `npm run build` (builds client, validates server)
- **Run**: `npm run start --workspace server` (production Express server)
=======
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Known workspace note

The Replit workflow `Start application` is currently configured to wait for port `5000` (a legacy from the previous scaffold). The synced Vite client now binds to `5173`, so the workflow's port-detection times out even though both processes start successfully. Updating the workflow port mapping is out of scope for this sync task.
>>>>>>> 739da302a8f24781514738fa22ca63638c3f6011
