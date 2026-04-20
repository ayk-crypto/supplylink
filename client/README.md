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
- `/inventory`
- `/inventory/products/:id`
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

## Module 20O Inventory Screens

The app shell now includes an Inventory section wired to the existing
inventory backend (`/api/v1/inventory/*`). No backend contracts were
changed and no new endpoints were added.

Inventory overview (`/inventory`):

- Lists products with search, status filter, and pagination using
  `GET /api/v1/inventory/products`.
- Shows current stock quantity, unit price, status, and a stock health
  indicator: in stock, low stock (≤ 5), out of stock (= 0), or negative
  (< 0).
- Each row exposes View and Adjust actions.

Product inventory detail (`/inventory/products/:id`):

- Loads the product summary and current stock from
  `GET /api/v1/inventory/products/:productId`.
- Shows the full stock movement history with type, signed quantity,
  reference type, reference id, notes, and created date from
  `GET /api/v1/inventory/movements?productId=…`, with movement type
  filter and pagination.
- The Adjust stock action opens the manual adjustment form.

Manual stock adjustment:

- Posts to `POST /api/v1/inventory/adjust` with product, movement type
  (adjustment, inbound, outbound), quantity, optional reference type,
  and optional notes — matching the backend schema.
- Inbound and outbound require a positive quantity; adjustment accepts
  signed values so stock can be lowered with a negative number.
- Success and failure both surface a toast, then reload the product and
  movement history.

The frontend reflects backend-supported behavior only and adds no
client-side stock blocking or inventory rules.

## Module 20T Audit / Activity History

Audit history surfaces the workspace activity stream produced by the backend
(`GET /api/v1/audit` and `GET /api/v1/audit/:entityType/:entityId`).

Routes:
- `/audit` — overview of every audit event for the current vendor
- `/audit/:entityType/:entityId` — history scoped to a single record

The overview screen filters by entity type (product, order, invoice, quotation,
payment), event type (free-text match, e.g. `invoice.created`), and a date
range. Pagination uses the standard backend page/pageSize contract (page size
20, max 100). Each event card shows the event label and code, entity type with
a deep link to the related record when known, the actor user id (or "System"),
the created timestamp, and a metadata summary built from the first few non-
empty metadata fields.

The inventory product detail screen exposes an "Audit history" action that
opens the entity-scoped variant. The same `/audit/:entityType/:entityId`
pattern can be linked from any other detail screen as needed (orders,
invoices, quotations, payments).

Service helpers live in `client/src/services/auditApi.js` and reuse the
shared `request` and `toQueryString` utilities — no new HTTP plumbing.

## Module 20AA Frontend Settings Persistence and Propagation

The `/settings` screen is no longer local-only. Settings now load from and
save to the backend (`GET /api/v1/settings`, `PATCH /api/v1/settings`) and
key preferences propagate across the app.

API service:

- `client/src/services/settingsApi.js` exposes `getSettings()` and
  `updateSettings(payload)` using the shared `httpClient`.

Provider and context:

- `client/src/features/system/SettingsProvider.jsx` wraps the authenticated
  shell. It loads settings on sign-in, deep-merges the response over the
  default schema (so missing fields fall back safely), exposes
  `{ settings, isLoading, isHydrated, error, refresh, save }`, and is
  consumed via `useAppSettings()` from
  `client/src/features/system/settingsContext.js`.
- Defaults and a deep-merge helper live in
  `client/src/features/system/settingsDefaults.js` and are also used as the
  reset payload.

Migration from localStorage:

- The previous `supplylink.settings.v1` localStorage key is read on first
  load only. If present, the provider merges its values onto the response,
  PATCHes the result back to the backend, and clears the legacy key. If the
  PATCH fails, the legacy key is preserved and migration is retried on the
  next save. The `/settings` screen no longer reads or writes localStorage.

Settings screen behavior:

- Reads its current draft from the provider, saves with `PATCH /settings`,
  and shows success / error toasts.
- "Reset to defaults" PATCHes the default schema back to the backend; the
  destructive confirmation respects the `confirmDestructiveActions`
  preference.
- A "Try again" link surfaces when the initial load fails so the user can
  retry without leaving the screen.

Propagation:

- `client/src/features/system/settingsFormat.js` provides
  `formatMoneyWith(settings, value)`, `formatDateWith(settings, value)`,
  `getDefaultPageSize(settings, fallback)`,
  `shouldShowNotificationsBadge(settings)`, and
  `shouldConfirmDestructive(settings)`.
- Currency display: `DashboardScreen` now formats every money value
  (outstanding receivables, recent orders, recent invoices, KPI tiles)
  through `formatMoneyWith`, honoring the configured currency code,
  decimal places, and thousands separator.
- Default page size: `InvoiceListScreen`, `InventoryListScreen`, and
  `TransactionListScreen` (Orders + Quotations) read `defaultPageSize`
  from settings instead of the hardcoded 10. Other lists keep their
  existing page sizes for now.
- Notifications badge: `NotificationBell` hides the unread count badge
  when `notificationsBadgeEnabled` is false. The bell itself and the
  dropdown stay available.
- Destructive confirmation: the Settings screen reset action respects the
  preference. Other destructive flows can adopt
  `shouldConfirmDestructive` incrementally without further plumbing.

Graceful fallback:

- If `GET /settings` fails, the provider falls back to defaults merged
  with any legacy localStorage values, surfaces the error on the Settings
  screen, and keeps the rest of the app rendering with sensible defaults.
- Older backends that omit any of the four sections or any individual
  field continue to work because every formatter and consumer reads
  through the merged shape.

## Module 20AB Frontend Settings Propagation Completion

Module 20AB extends the propagation introduced in 20AA across the rest of
the app without changing the backend or redesigning any screen.

New helpers in `client/src/features/system/settingsFormat.js`:

- `formatDateTimeWith(settings, value)` — date + time formatter that
  honors the user's preferred date format (medium / long / iso) and
  always includes hour and minute.
- `confirmDestructive(settings, message)` — wraps `window.confirm`. When
  the `confirmDestructiveActions` preference is off, returns `true`
  immediately so existing validation and error handling keep working.

Default page size now propagates to:

- `CustomersScreen`, `CategoriesScreen`, `ProductsScreen`
- `LedgerOverviewScreen`
- `NotificationsScreen`
- `AuditScreen`, `EntityAuditScreen`
- `OperationalReportScreen`
- `InventoryDetailScreen` (movement history list)

Each screen reads `pageSize` once via `getDefaultPageSize(settings, …)`,
threads it through the existing `useMemo` query, and keeps user-selected
page state intact across hydration.

Destructive confirmation now uses the shared helper in:

- `SettingsScreen` (reset to defaults)
- `InvoiceDetailScreen` (void invoice)
- `TransactionDetailScreen` (cancel order)

Date format now uses `formatDateTimeWith` in:

- `InventoryDetailScreen` movement timestamps
- `AuditScreen` and `EntityAuditScreen` event timestamps

Other date helpers in `inventoryUtils.js`, `auditUtils.js`, and
`notificationUtils.js` are kept as locale-default fallbacks for any
screens that still call them directly.

Hardening notes:

- The provider's legacy localStorage migration is gated by an internal
  ref so it runs at most once per session and does not retry on every
  hydration.
- Late-arriving settings change `pageSize` from the default 10/20 to the
  user's preference at most once per screen mount, without resetting the
  user's current page selection.
- Every consumer flows through the same merge / fallback path, so a
  partial backend response or a missing field never breaks an older
  environment.

## Module 20AC Frontend UX, Responsiveness, and Loading Polish

Module 20AC adds a small set of shared UI primitives, polishes the
loading and error experience on the operational screens, and tightens
responsive behavior — additive only, with no redesign and no backend
changes.

New shared components in `client/src/components/ui/ResourceScreens.jsx`:

- `LoadingState` — consistent in-line loading message with the existing
  spinner styling, exposed as `aria-live="polite"`.
- `LoadingSkeleton` — animated shimmer placeholder rows used while
  hydrating data-heavy panels, including the dashboard hero, KPI tiles,
  and the recent notifications panel.
- `ErrorState` — consistent danger banner with an optional `onRetry`
  button. Hides itself when `message` is empty so it can be rendered
  unconditionally.
- `SectionHeader` — wraps the existing `panel-heading` pattern with a
  flex layout that keeps the action area aligned and wraps cleanly on
  smaller screens.
- `TableScroll` — horizontal-scroll wrapper for wide resource tables to
  prevent page overflow on narrow viewports.

Loading and error UX:

- The dashboard now renders a layout-stable skeleton while loading
  instead of a single text line, removing the jarring jump when data
  arrives. The recent notifications panel uses the same skeleton.
- The Settings screen, all master-data lists (Customers, Categories,
  Products), Inventory list, Invoices list, and the Orders/Quotations
  list now render their errors through `ErrorState` with a retry button
  wired to the `useResourceDirectory` `reload()` action.
- All the loading messages above were swapped to `LoadingState` for
  consistent styling and accessibility (`aria-live`, single source of
  truth for the spinner).

Responsiveness polish:

- The pagination bar collapses to a stacked layout under 640 px with
  the Previous/Next buttons sharing the row width evenly.
- New `.section-heading` utility keeps panel actions wrapping on small
  screens without overflowing.
- Skeleton blocks honor the existing surface tokens so dark and light
  backgrounds render correctly.

Constraints respected:

- No backend changes, no redesign, no new product features.
- Existing CSS classes and visual language preserved; new utilities are
  additive.
- All flows and API contracts unchanged.

## Module 20AD Frontend Screen Consistency Completion

Module 20AD completes practical adoption of the shared UI primitives
introduced in Module 20AC across the remaining major frontend
surfaces. Additive only — no backend changes, no redesign, no new
product features.

Shared UI adoption coverage after this module:

- `TableScroll` (horizontal-scroll wrapper) is now applied to every
  wide `.resource-table` block in the operational app: master-data
  Customers / Products / Categories, Invoices list and detail line
  items, Orders / Quotations list and detail line items, Inventory
  detail movements (already a card list), the customer Ledger
  Overview and Customer Statement, the Receivables and Statements
  reports, and all three Operational report row blocks (invoices /
  payments / orders).
- `LoadingState` and `ErrorState` (with retry where reload exists)
  now back the loading and error surfaces of: InvoiceDetailScreen,
  TransactionDetailScreen (orders + quotations detail),
  InventoryDetailScreen (product + movements panels),
  CustomerLedgerScreen, LedgerOverviewScreen, NotificationsScreen,
  AuditScreen, EntityAuditScreen, ReportsHomeScreen,
  OperationalReportScreen, ReceivablesReportScreen.
- `LoadingSkeleton` is used for layout-stable loading on heavy detail
  pages: InvoiceDetailScreen, TransactionDetailScreen, and
  CustomerLedgerScreen. The dashboard hero / KPI tiles and recent
  notifications panel continue to use it from Module 20AC.
- `SectionHeader` now backs the three dashboard column panels
  (Recent orders, Recent invoices, Notifications) so the title +
  hint + action row uses a single consistent implementation that
  wraps cleanly on small screens.

Retry wiring:

- All adopting screens that already had a `reload` action from
  `useResourceDirectory` now thread it into `ErrorState.onRetry`.
  Two screens did not previously destructure `reload` and were
  updated: `OperationalReportScreen` and `ReceivablesReportScreen`.
- Detail screens that load via a one-shot effect (Invoice / Order /
  Quotation / Customer Statement) render `ErrorState` without
  `onRetry`; the existing back-to-list / refresh path is preserved.

Constraints respected:

- No backend changes.
- No redesign of tables, panels, or layouts.
- All flows, API contracts, and class names preserved; the only
  structural change to existing markup is wrapping `.resource-table`
  blocks with `<TableScroll>`.
- Empty-state ("No detail found.") messages on detail screens are
  intentionally left as `surface-message` because they are neither a
  loading nor an error state.

## Module 20AE Frontend Attachments / Files Integration

Module 20AE adds practical attachment / file handling to the major
operational entity screens, wired against the existing backend
`/files` endpoints. No backend changes, no redesign — purely
additive UI on top of detail screens that already exist.

Backend endpoints used (unchanged):
- `GET /files/entity/:entityType/:entityId` — list
- `POST /files` (multipart `file`, `entityType`, `entityId`) — upload
- `GET /files/:fileId/download` — authenticated stream download
- `DELETE /files/:fileId` — delete

Entity screens with attachment support:
- Customers — attachments section is rendered inside the customer
  edit form (only when editing an existing customer; not available
  during create because the customer ID does not yet exist).
- Quotations — attachments section appended to the quotation
  detail screen.
- Orders — attachments section appended to the order detail screen.
- Invoices — attachments section appended to the invoice detail
  screen between the payment form and payment history.

Backend also allows the `routes` entity type, which has no
dedicated frontend detail screen at this time and is therefore not
wired. Inventory / products are intentionally not wired because the
backend allow-list does not include them.

Supported attachment actions per screen:
- List uploaded files with original filename, size, MIME type, and
  upload timestamp.
- Upload via a hidden file input triggered by an "Upload file"
  button; uploading state is shown on the button and the panel
  refreshes once the upload completes.
- Download via authenticated fetch to `/files/:id/download`; the
  blob is saved through a transient object URL using the filename
  from `Content-Disposition` (with a fallback to the stored
  original filename).
- Delete with the standard destructive-confirm guard
  (`confirmDestructive` honoring the user's setting).

UX notes / limitations:
- Upload progress is shown as a button state (`Uploading…`); the
  underlying `fetch` API does not expose granular upload progress
  events without switching to `XMLHttpRequest`, which would deviate
  from the existing service pattern. The button is disabled while
  the upload is in flight to prevent duplicate submissions.
- Long file names truncate with ellipsis on the row title, with the
  full name available in the `title` tooltip.
- Below 640px the attachment row stacks vertically and the action
  buttons align to the right.
- Customer attachments are only available in the customer edit
  modal because there is no standalone customer detail screen.
- All loading, empty, and error states use the shared primitives
  introduced in Module 20AC (`LoadingState`, `ErrorState`,
  `EmptyState`, `SectionHeader`).

## Module 20AF Attachment Visibility on List Screens

Module 20AF adds a lightweight at-a-glance attachment indicator to
the major list screens. Users can now see which records have files
attached without opening each detail screen. No backend changes,
no redesign — purely additive on top of the row markup that
already existed.

New shared pieces:
- `client/src/features/attachments/useAttachmentCounts.js` — small
  hook that takes `(entityType, ids[])` and returns a map of
  `{ entityId: count }`. Stabilizes the dependency by joining the
  ids; cancels in-flight fetches via `AbortController` and a
  cancelled flag when the page changes or the component unmounts;
  swallows per-id failures silently so a single bad fetch never
  blocks the rest.
- `client/src/features/attachments/AttachmentBadge.jsx` — inline
  pill rendering an SVG paperclip + the count. Renders nothing for
  zero / undefined counts. Becomes a clickable `<button>` when an
  `onClick` is provided (with `aria-label="N attachments"`),
  otherwise a `<span>`.

Wired into the row title cell of:
- Customers — clicking the badge opens the customer edit modal,
  where the attachments panel from Module 20AE lives.
- Invoices — clicking navigates to the invoice detail screen.
- Orders — clicking navigates to the order detail screen.
- Quotations — clicking navigates to the quotation detail screen.

Performance notes:
- The backend `GET /files/entity/:entityType/:entityId` endpoint is
  per-id only (no comma-separated batch), so the hook fires up to
  N parallel small requests after the table has rendered. With the
  default page size of ~10 (max ~25), modern browsers handle this
  comfortably and the table is never blocked on attachment data.
- The dependency key is `ids.join(",")` and the underlying
  `items` array is memoized on `data`, so re-renders that don't
  change the visible page do not refetch counts.
- All fetches abort on page / filter change.

Behavior:
- The badge appears only when at least one file is present and
  only after the count has resolved — the row never flickers a
  zero count first.
- If the attachment listing fails for any row, the badge is simply
  not shown for that row; no toast, no error UI.
- Below the existing 640px breakpoint the badge stays inline next
  to the row title and wraps with the title text.

## Module 20AG Delivery Routes UX

Module 20AG fills in the missing frontend coverage for the delivery
routes / route stops APIs that the backend already exposes. No
backend changes — the new screens consume the existing
`/api/v1/routes` endpoints and the same attachments allow-list
that already includes the `routes` entity type. All shared
primitives (PageHeader, Toolbar, Pagination, FormPanel, Field,
TableScroll, SectionHeader, AttachmentBadge, AttachmentsPanel,
ToastProvider, useResourceDirectory) are reused exactly as on
the other operational screens.

New service:
- `client/src/services/routeApi.js` — `listRoutes`, `getRoute`,
  `createRoute`, `updateRoute`, `listRouteStops`,
  `createRouteStop`, `updateRouteStop`.

New shared utilities:
- `client/src/features/routes/routeUtils.js` — route status enum
  (draft / planned / in_progress / completed / cancelled), stop
  status enum (pending / completed / skipped), label maps, date
  and date-time formatters, customer label resolver, and
  `nextSequenceNumber(stops)` helper for the next stop slot.

New screens:
- `client/src/features/routes/RoutesListScreen.jsx` — paginated
  list with search by route name, status filter, reset action,
  status pill, vehicle / driver summary, and per-row attachment
  badge fed by the shared `useAttachmentCounts` hook. The "New
  route" modal collects name (required, ≥ 2 chars), date,
  vehicle label, status, and notes; on success the user is
  navigated straight into the new route's detail screen so the
  next natural action — adding stops — is one click away.
- `client/src/features/routes/RouteDetailScreen.jsx` — header
  with status pill, status-transition buttons gated by the
  current state (`draft → planned → in_progress → completed`,
  plus `cancel` from any non-terminal state, gated by the same
  destructive-action confirmation preference used elsewhere). A
  detail grid summarises status / date / driver / vehicle /
  stop count / last-update. The Stops table renders each stop
  with a numbered sequence pill, customer name, status pill,
  planned arrival, linked order number (when present), notes,
  and per-row Complete / Skip / Edit actions wired to PATCH on
  the stop. The "Add stop" modal pre-fills the next sequence
  number, lets the user pick a customer from the active
  customer list, and accepts status, planned arrival, and
  notes. Edit mode keeps the customer association immutable
  (the backend allows reassignment, but the v1 UI keeps the
  stop locked to its original customer to avoid accidentally
  rewiring an in-flight stop). The screen embeds the standard
  attachments panel with `entityType="routes"`.

Wiring:
- `client/src/app/routes.js` — added a `routes` nav entry
  (between Inventory and Ledger) and a `route-detail` regex
  matching `/routes/:id`.
- `client/src/app/App.jsx` — imports and screens-map entries
  for `routes` and `route-detail`.

Styling:
- `.route-grid` — list row layout (route / date / status /
  vehicle / action).
- `.route-stop-grid` — detail row layout (sequence pill /
  customer / status / planned arrival / order / actions).
- `.route-stop-grid .stop-sequence` — circular numbered pill
  for the visible stop ordering.
- `.route-stop-grid .stop-actions` — wrappable flex row for the
  Complete / Skip / Edit buttons.
- Both grids are added to the existing mobile breakpoint that
  collapses the desktop grid columns into stacked cards, so
  routes and stops remain readable on narrow viewports.

Backend limitations preserved (not changed):
- The frontend has no users-list API yet, so driver assignment
  is not part of the route create/edit form. Driver name is
  shown read-only on the detail page when the backend response
  includes it.
- The customer selector on the Add Stop form loads the first
  100 active customers; tenants beyond that page would need a
  typeahead, which is left as a future enhancement.
- The backend supports linking a stop to an order. The v1 form
  does not collect `orderId`, but the detail row surfaces the
  linked order number whenever the backend returns one.

Behavior notes:
- Failed list / detail / mutation calls show a toast and
  preserve the rest of the screen (no full-page error wipe-
  outs).
- Per-row attachment counts and customer-list lookups use
  AbortController plus an `active` flag so re-renders and
  unmounts cannot leak stale state.
- Status-transition buttons are disabled when the current
  status does not allow that transition; the disabled state
  carries a `title` explaining why.
