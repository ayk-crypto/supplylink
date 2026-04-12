# Client

React frontend for SupplyLink, built with Vite.

## Highlights

- Professional responsive app shell with sidebar navigation and top header
- Login screen integrated with `/api/v1/auth/login`
- Auth token storage for the current browser session foundation
- Protected dashboard that loads `/api/v1/auth/me`
- Dashboard widgets powered by `/api/v1/ui/dashboard` and `/api/v1/ui/notifications-panel`
- Centralized auth-aware API service layer
- ESLint configuration for maintainable growth

## Local Setup

Create a local env file:

```bash
copy client\.env.example client\.env.development
```

The frontend expects:

```bash
VITE_API_BASE_URL=/api/v1
```

With the default Vite dev proxy, start the full stack from the repo root:

```bash
npm run dev
```

Or run the client alone:

```bash
npm run dev --workspace client
```

Login uses existing backend users. For the demo seed, run `npm run db:bootstrap`
from the repo root and sign in with:

```text
vendor.admin@supplylink.local / Password123!
```

If the account has multiple vendor memberships, provide the vendor ID in the
login form. Otherwise it can be left blank.
