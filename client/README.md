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
- `/invoices/new`
- `/invoices/from-order/:id`
- `/invoices/:id`
- `/ledger`
- `/ledger/customers/:id`
- `/reports`
- `/reports/receivables`
- `/reports/invoices`
- `/reports/payments`
- `/reports/orders`
- `/reports/statements`
- `/notifications`

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

## Module 20F Invoice Creation And Print Entry Points

Invoices now support creation from the frontend:

- `/invoices/new` creates a manual invoice with customer, product lines,
  quantity, unit price, notes, status, issue date, and due date.
- `/invoices/from-order/:id` starts an invoice from an existing order, prefills
  the order customer and line items, and allows line-item edits before submit.
- The invoice list includes a Create invoice action, and order detail screens
  include a Create invoice action.

Successful creation redirects to `/invoices/:id`. Client-side validation blocks
missing customers, missing orders, empty line-item sets, invalid quantities, and
invalid prices before the API call.

Invoice detail includes a Print / Download action powered by
`GET /api/v1/invoices/:invoiceId/print`. The backend currently returns a
structured JSON print payload rather than PDF bytes, so the frontend opens a
lightweight browser print view. Use the browser print dialog to print or save as
PDF until a first-class PDF renderer is added.

## Module 20G Customer Ledger And Receivables

Customer ledger screens provide receivables visibility:

- `/ledger` shows an active customer receivables overview with search,
  pagination, visible invoice total, visible paid total, visible outstanding
  total, and a statement link for each customer.
- `/ledger/customers/:id` shows a statement-style customer ledger with customer
  summary, ending balance, filtered debit/credit totals, date filters, entry
  type filter, source type filter, and running balance.

The statement detail uses `GET /api/v1/ledger/customer/:customerId`, which
returns the backend-calculated running balance and ending balance. The overview
uses the customer directory plus existing invoice data for the currently visible
customer page because the backend does not yet expose a dedicated
receivables-by-customer aggregate endpoint.

## Module 20H Reports And Exports

Reports now have route-driven frontend screens:

- `/reports` opens a reports home screen with operational summary metrics and
  links to each report.
- `/reports/receivables` groups invoice report rows by customer to show invoice
  total, paid total, and outstanding total.
- `/reports/invoices` uses `GET /api/v1/reports/invoices` and exports through
  `GET /api/v1/reports/exports/invoices.csv`.
- `/reports/payments` uses `GET /api/v1/reports/payments` and exports through
  `GET /api/v1/reports/exports/payments.csv`.
- `/reports/orders` uses `GET /api/v1/reports/orders` and exports through
  `GET /api/v1/reports/exports/orders.csv`.
- `/reports/statements` previews customer statement reports and exports through
  `GET /api/v1/reports/exports/customer-statement/:customerId.csv`.

The customer ledger detail screen also includes a CSV export action for the
selected customer statement. Report filters intentionally match the backend
schemas: date range, customer, status where supported, payment method where
supported, and search where supported.

## Module 20L Notifications / Activity Center

The app shell now includes an activity center wired to the existing
notifications backend (`/api/v1/notifications/*`). No backend contracts were
changed and no new endpoints were added.

Header bell:

- A notification bell appears in the top header on every authenticated
  workspace screen.
- An unread badge surfaces the live unread count and refreshes on a 60 second
  poll. The count also updates immediately after mark-as-read actions taken
  anywhere in the app.
- Clicking the bell opens a dropdown panel with the most recent notifications,
  a Mark all as read action, and a View all notifications link.

Activity center page (`/notifications`):

- Lists every notification for the signed-in user with pagination and an
  All / Unread filter.
- Each row shows the title, message, relative time, type, related entity tag,
  and per-row Mark read and Open actions.
- Mark all as read clears the inbox in one click.

Navigation behavior:

- Clicking a notification (in either the dropdown or the page) marks it as
  read and routes to the related entity using `relatedEntityType` and
  `relatedEntityId`.
- Mapped destinations: invoice → `/invoices/:id`, order → `/orders/:id`,
  quotation → `/quotations/:id`, customer → `/ledger/customers/:id`,
  ledger / payment → `/ledger`, report → `/reports`,
  dashboard → `/dashboard`.
- If a related entity type does not yet have a frontend destination, the
  user stays in the activity center and a toast explains there is no link
  available, so no broken navigation occurs.

API service:

- `client/src/services/notificationsApi.js` wraps the existing endpoints —
  `GET /notifications`, `GET /notifications/unread-count`,
  `GET /notifications/:id`, `PATCH /notifications/:id/read`, and
  `PATCH /notifications/read-all` — using the shared `httpClient` and
  `queryString` helpers, so auth, error shape, and request style match the
  rest of the client.

## Module 20M Frontend Polish

A visual polish pass has been applied across the app shell and existing
screens. No routes, APIs, or business flows changed.

- Refined design tokens (slightly cooler neutrals, larger card radius, focus
  ring) defined at the bottom of `client/src/styles/index.css` so the rest of
  the original stylesheet is untouched.
- Sidebar now uses softer hover/active states with an accent rail on the
  active item, and the brand mark uses a subtle gradient.
- Top bar is more compact, the session chip is pill-shaped, and the
  notifications bell sits inline cleanly on every authenticated screen.
- Workspace content is now centered with a max width on large monitors so
  long pages don't stretch uncomfortably wide.
- Dashboard hero uses a soft gradient surface, the receivables card is a
  dark accent panel with a small collected-vs-invoiced progress bar, and
  KPI tiles have an accent top border, monochrome glyph, and hover lift.
- Tables get hover row highlighting; on small screens table rows convert to
  individual cards (existing breakpoint behavior preserved).
- Loading messages are now opt-in via the `loading` modifier on
  `surface-message`, which adds a small inline spinner. Non-loading
  informational messages (for example "No invoice found.") render plain.

The polish is implemented as additive overrides at the bottom of the global
stylesheet plus a small `MetricCard` enhancement on the dashboard. All other
screens keep their existing markup and behavior.
