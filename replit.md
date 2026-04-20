# SupplyLink

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
```
npm run dev
```

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
