# Client

React frontend for SupplyLink, built with Vite.

## Highlights

- Professional responsive app shell with sidebar navigation and top header
- Login screen integrated with `/api/v1/auth/login`
- Auth token storage for the current browser session foundation
- Protected dashboard that loads `/api/v1/auth/me`
- Dashboard widgets powered by `/api/v1/ui/dashboard` and `/api/v1/ui/notifications-panel`
- Customers, Categories, and Products screens using real vendor-scoped backend data
- Create and edit flows for customer relationships, catalog categories, and products
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

## Module 20B Screens

The app shell navigation now includes:

- Dashboard
- Customers
- Categories
- Products

Customers supports list/search/status filter, pagination, create, and edit
against `/api/v1/customers`.

Categories supports list/search, pagination, create, and edit against
`/api/v1/categories`.

Products supports list/search/status/category filters, pagination, create, and
edit against `/api/v1/products`. The product form loads category options from
`/api/v1/categories`.

Vendor admins can create and edit these records. Vendor staff can read the
screens but backend write attempts remain subject to the existing API role
guards.

## Module 20C Routing And UX Hardening

The frontend now uses URL-based navigation for the current app shell without
adding a routing dependency:

- `/dashboard`
- `/customers`
- `/categories`
- `/products`
- `/quotations`
- `/quotations/new`
- `/quotations/:id`
- `/orders`
- `/orders/new`
- `/orders/:id`
- `/invoices`
- `/invoices/:id`

Direct entry, refresh, and browser back/forward are handled with a small History
API router in `client/src/app`. Unknown workspace paths render a safe not-found
screen inside the protected shell.

Customers, Categories, and Products now share lightweight toast feedback for
successful saves and API failures, plus inline client-side validation for common
form issues such as required names, valid email format, valid slugs, and valid
non-negative product pricing.

## Module 20D Transaction Screens

Quotations and Orders now have route-driven frontend foundations:

- List screens with search, status filter, customer filter, pagination, and
  responsive rows.
- Create screens with customer selection, product line items, quantity, unit
  price, notes, dates, status, inline validation, and totals preview.
- Detail screens with header data, customer summary, line items, totals, notes,
  and status.

The backend remains the source of truth for final totals and workflow rules.
This pass intentionally does not add edit/status action flows yet, even though
the API supports patching, so those workflows can be designed consistently with
future invoice screens.

## Module 20E Invoice And Payment Screens

Invoices now have route-driven list and detail screens:

- `/invoices` supports search, status filter, customer filter, pagination, and
  responsive invoice rows.
- `/invoices/:id` shows invoice header details, customer summary, line items,
  totals, paid/outstanding amounts, notes, and payment history.
- Payable invoices can accept a payment from the detail screen with amount,
  method, optional reference, and optional note.

Payment capture uses `/api/v1/payments`, reloads invoice detail and payment
history after success, and blocks invalid client-side submissions such as zero
payments or amounts above the invoice balance due. Backend workflow rules still
decide whether an invoice is payable.
