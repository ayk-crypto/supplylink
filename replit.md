# SupplyLink

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

```
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Known workspace note

The Replit workflow `Start application` is currently configured to wait for port `5000` (a legacy from the previous scaffold). The synced Vite client now binds to `5173`, so the workflow's port-detection times out even though both processes start successfully. Updating the workflow port mapping is out of scope for this sync task.
