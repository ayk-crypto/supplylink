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

## Module 20AH Reports UX and Decision Layer

Module 20AH lifts the reporting screens from "raw tables with
filters" toward a more decision-friendly experience without
changing any backend contracts. All summaries reuse the data
that the existing report endpoints already return.

New shared pieces:
- `client/src/features/reports/dateRangePresets.js` — pure date
  helpers. Exports `DATE_PRESETS` (Today / This week / Last 30
  days / This month / This quarter / All time), `getPresetRange`
  returning `{dateFrom, dateTo}` as local-day `yyyy-mm-dd`
  strings, and `matchPreset` to highlight the chip that exactly
  matches the current filters.
- `client/src/features/reports/DateRangePresetChips.jsx` — small
  presentational chip group with `role="group"` and an
  `aria-pressed` active chip. Slots into the existing `Field`
  primitive so it lines up with the rest of the form grid.

Per-screen improvements:
- **Reports home** — clearer hierarchy with `SectionHeader`s
  ("At a glance" + "Open a report"), a `LoadingSkeleton` instead
  of a one-line text loader, and an `ErrorState` with retry so
  the page no longer goes blank when the summary endpoint
  fails.
- **Operational reports (Invoices / Orders / Payments)** — the
  filter form gains a "Quick range" Field with the preset chip
  group; selecting a preset updates `dateFrom` / `dateTo` and
  resets to page 1. A new summary metric strip appears above the
  results showing per-page totals: invoices (count, total, paid,
  outstanding), orders (count, total), payments (count, total
  amount). The hint under the count tile says "page totals · X
  of Y matching kind" whenever the page is a subset of the
  filtered total, so users always know whether the totals are
  the page or the whole filter.
- **Receivables report** — gains the same "Quick range" chip
  group; the existing customer-grouped summary tiles and CSV
  export are kept exactly as before.
- **Statements report** — gains the chip group inside the
  existing Load Statement form; selection only updates form
  state so the user still controls when the (heavier) statement
  fetch fires.

Styling:
- `.date-preset-row` — wrappable flex row of chips.
- `.date-preset-chip` — rounded pill with subtle background,
  hover, and focus-visible outline.
- `.date-preset-chip.is-active` — accent fill with white text
  to make the current selection unambiguous.
- All variables fall back to safe defaults so the chips render
  cleanly even before theme tokens load.

Constraints respected:
- No backend changes. No new endpoints. No new data models.
- All summary numbers come from the existing list responses;
  the new tiles are computed client-side and clearly labelled
  as "visible page" totals.
- All shared primitives (`PageHeader`, `SectionHeader`, `Field`,
  `Pagination`, `TableScroll`, `LoadingSkeleton`, `ErrorState`,
  `EmptyState`, metric-tile, ToastProvider, useResourceDirectory)
  are reused unchanged.

## Module 20AI Customer Detail Screen

Module 20AI introduces a dedicated Customer Detail screen at
`/customers/:id` so customer-related data is no longer
fragmented across the list, the ledger, the orders/quotations
lists, the invoices list, and the attachments modal. It is
purely additive — no backend endpoints were added or changed,
and the existing edit modal on the list still works for quick
edits.

New files:
- `client/src/features/master-data/CustomerDetailScreen.jsx` —
  the unified view. Each section loads independently so the
  page is interactive while data streams in.
- `client/src/features/master-data/CustomerForm.jsx` — the
  customer create / edit form, extracted from the previously
  inline form in `CustomersScreen.jsx` so it can be reused on
  the detail screen's Edit action.

Sections (all rendered with the shared `SectionHeader`):
1. **Overview** — profile fields (full name, company, email,
   phone, account code, relationship status), notes, and a
   four-tile metric strip: invoices on file (count from
   pagination), outstanding (sum of the loaded invoices),
   invoiced (sum of the loaded invoices), and ledger ending
   balance. Sample-based totals are clearly labelled.
2. **Ledger** — links to the existing `CustomerLedgerScreen`
   for the full statement (filters, totals, CSV export); the
   detail screen only surfaces a quick summary so logic isn't
   duplicated.
3. **Recent orders** — last five orders for the customer with
   a "View all" link to `/orders`.
4. **Recent quotations** — last five quotations for the
   customer with a "View all" link to `/quotations`.
5. **Recent invoices** — last five invoices for the customer
   with a "View all" link to `/invoices`.
6. **Recent payments** — last five payments via the existing
   `listPaymentReport` endpoint with a link to the payments
   report.
7. **Attachments** — reuses `AttachmentsPanel` with
   `entityType="customers"`, identical to the modal panel.
8. **Recent activity** — last ten audit events via
   `getEntityAuditHistory("customers", id)`, with a link to
   the full audit history at `/audit/customers/:id`.

Header actions: Back, Open statement, Full audit, Edit. The
Edit action opens the same `CustomerForm` modal used on the
list screen and refreshes the customer section on save.

Loading strategy:
- A small `useAsyncSection` hook fetches each section with an
  `AbortController` and an `active` flag to avoid setState
  after unmount.
- `SectionShell` renders a `LoadingSkeleton` while loading,
  an `ErrorState` with retry on failure, and an `EmptyState`
  when the response has no items, so failures in one section
  never block the rest of the page.
- All seven fetches run in parallel on mount and are cancelled
  if the customer id changes.

Navigation integration:
- Customer name, attachment badge, and a new "View" button on
  each `CustomersScreen` row navigate to `/customers/:id`.
- The existing "Edit" button on each row still opens the quick
  edit modal so the modal flow remains usable.
- New route `customer-detail` added to `routes.js` and
  `App.jsx`.

Constraints respected:
- No backend changes. All sections use existing endpoints:
  `getCustomer`, `listOrders`, `listQuotations`, `listInvoices`,
  `listPaymentReport`, `getCustomerLedger`,
  `getEntityAuditHistory`.
- All shared primitives (`PageHeader`, `SectionHeader`, `Field`,
  `LoadingSkeleton`, `ErrorState`, `EmptyState`, `TableScroll`,
  metric tiles, `AttachmentsPanel`, `CustomerForm`,
  `ToastProvider`) are reused unchanged.

## Module 20AJ — Hardening, edge cases, reliability pass

A non-redesign hardening sweep over the existing detail screens.
No backend changes; additive only.

Stale state on id change (flash of previous record on
`/orders/:id` → another `/orders/:id` navigation):
- `InvoiceDetailScreen` resets `invoice`, `payments`, and
  `pendingAction` at the start of the load effect so the
  previous invoice does not flash before the new one loads.
- `TransactionDetailScreen` (orders + quotations) resets
  `detail`, `pendingAction`, and `isConverting` on id/kind
  change.
- `InventoryDetailScreen` resets `product` on id change.
  All three screens already use `LoadingSkeleton` after the
  reset, so the user now sees a clean skeleton between
  records instead of stale fields.

Destructive action guards:
- Quotation `Reject` in `TransactionDetailScreen` now goes
  through `confirmDestructive` with the same pattern used
  by `Cancel` for orders. Other destructive actions
  (`Void` invoice, `Delete` attachment, `Cancel` order)
  were already guarded.

Empty-state consistency:
- Replaced raw `<p className="empty-panel">` and
  `<p className="surface-message">` fallbacks with the
  shared `EmptyState` primitive in `InvoiceDetailScreen`
  (no invoice / no line items / no payments) and
  `TransactionDetailScreen` (no detail / no line items)
  so empty messages render with the same surface and
  spacing as the rest of the app.

Long-content overflow:
- Added `overflow-wrap: anywhere` to `.resource-row strong`
  and `.detail-field strong` so very long names, emails,
  filenames, and reference numbers wrap inside their cells
  instead of pushing layout. `.resource-row span` already
  had this rule.

Verification:
- `npm run lint` clean.
- `npm run build` green
  (`index-IrsCjVR9.js 387.82 kB / gzip 107.57 kB`,
  `index-DhQLVP-y.css 50.50 kB / gzip 9.59 kB`).

Constraints respected:
- No backend changes.
- No redesign — same surfaces, classes, and layouts.
- All shared primitives reused (`EmptyState`,
  `LoadingSkeleton`, `ErrorState`, `confirmDestructive`).

## Module 20AK — Final polish, demo readiness, launch confidence

A focused presentation pass over high-traffic screens. No
backend changes, no redesign, additive only.

Loading-state consistency on list screens:
- `CustomersScreen`, `ProductsScreen`, `CategoriesScreen`,
  `TransactionListScreens` (orders + quotations),
  `InvoiceListScreen`, `RoutesListScreen`,
  `InventoryListScreen`, and `AuditScreen` all migrated from
  the older `LoadingState` paragraph spinner to the shared
  `LoadingSkeleton` rows component used by the detail
  screens. Each one passes a meaningful `label` (e.g.
  "Loading customers") for screen readers.
- The skeleton now only renders when the list is empty
  AND loading, so re-fetches triggered by pagination or
  filter changes no longer push a skeleton above the
  existing rows — the table simply updates in place.

Per-button busy feedback on route stops:
- Stop `Complete` and `Skip` buttons in
  `RouteDetailScreen` now show "Saving…" while the
  transition is in flight, matching the pattern used by
  invoice / order / quotation lifecycle buttons. Buttons
  are still disabled during the request to prevent
  double-submit; the label change makes the busy state
  obvious in demos.

Empty-state primitive consistency on the dashboard:
- `DashboardScreen` `RecordList` (recent orders, recent
  invoices) and `NotificationsList` now render their
  empty messages through the shared `EmptyState`
  component instead of a one-off `<p class="empty-state">`,
  so empty panels share the same surface and spacing as
  every other section in the app.
- `RouteDetailScreen` "No route found" fallback also moved
  from raw `<p class="surface-message">` to `EmptyState`.

Verification:
- `npm run lint` clean.
- `npm run build` green
  (`index-B7u9Sjgf.js 387.86 kB / gzip 107.61 kB`,
  `index-DhQLVP-y.css 50.50 kB / gzip 9.59 kB`).

Constraints respected:
- No backend changes.
- No redesign — same surfaces, classes, layouts.
- All shared primitives reused (`LoadingSkeleton`,
  `EmptyState`).

## Module 20AL — Route Templates and Template-Based Route Generation

A separate planning layer for recurring weekly route plans. Templates live
alongside Routes; generated routes remain regular routes after creation.

Surfaces added:
- Sidebar: **Route Templates** (next to Routes).
- `/route-templates` — paginated list with search by name, active/inactive
  filter, reset, and an "Open" action per row. Columns: name + notes preview,
  recurrence summary, status, vehicle, default-stop count.
- `/route-templates/:id` — detail screen with template overview, recurrence,
  default stops table, notes, edit modal, and a Generate route action.

API layer (`client/src/services/routeTemplateApi.js`) wraps all 10 backend
endpoints under `/route-templates`: list/get/create/update/delete templates,
list/create/update/delete template stops, and `generate`.

Template create/edit modal:
- Name, vehicle label, status (active/inactive), notes.
- Recurrence type is locked to **Weekly** (the only value the backend accepts
  today).
- Weekday multi-select rendered as a chip grid (Sun–Sat) with at least one
  weekday required by client-side validation.

Template stop management (inside the detail screen):
- Lists default stops in sequence order.
- Add stop modal uses the existing customer list API
  (`listCustomers({ status: "active" })`) for the customer dropdown.
- Edit stop allows changing sequence number and notes; the customer is
  immutable (matches the backend stop-update contract).
- Remove stop is gated by `confirmDestructive`, and surfaces backend duplicate-
  sequence errors via the standard form-error and toast pattern.

Generate route flow:
- Modal collects route date (defaults to today), an optional name override
  (placeholder shows the template name), optional vehicle label and notes, and
  initial status (`draft` or `planned`).
- On success, shows a toast and navigates to the new route's detail screen
  (`/routes/:id`). The template itself is never mutated.
- Generate is disabled when the template has zero default stops or is
  inactive, with a tooltip explaining why.

Human-readable recurrence helpers in
`client/src/features/route-templates/routeTemplateUtils.js`:
- `formatRecurrenceDays([1,3,5])` → `"Mon/Wed/Fri"`
- `formatRecurrenceSummary(template)` → `"Weekly · Mon/Wed/Fri"` or
  `"Weekly on Thursday"` for single-day templates.

Constraints respected:
- No backend changes; all 10 endpoints consumed as-is.
- No redesign of the existing Routes screens.
- Recurrence type stays weekly only (matches backend Zod enum).
- Generated routes are normal routes — fully editable through `/routes/:id`.
- Reuses shared primitives (`PageHeader`, `SectionHeader`, `Toolbar`,
  `FormPanel`, `Field`, `LoadingSkeleton`, `ErrorState`, `EmptyState`,
  `TableScroll`, `Pagination`).

## Module 20AM — Workspace Branding (Logo + Primary Color)

Adds vendor-level branding controls that propagate from Settings into the
sidebar lockup and the printable invoice header. No backend changes; uses
the existing `/settings` PATCH (for `company.primaryBrandColor`) and the
`/settings/logo` multipart upload + DELETE endpoints.

Settings → **Company info** now includes:
- Logo tile (96×96): renders the workspace logo when present, otherwise a
  brand-colored initials placeholder derived from `displayName`/`legalName`.
- **Upload logo / Replace logo** — `<input type="file" accept="image/*">`
  routed through `uploadVendorLogo(file)`, which posts a `FormData` body to
  `POST /settings/logo` (the shared `httpClient` omits `Content-Type` so the
  browser sets the multipart boundary).
- **Remove logo** — `DELETE /settings/logo`, gated by `confirmDestructive`.
- **Primary brand color** — color-swatch input + hex text input + Clear
  button. Validated client-side against `#rgb` / `#rrggbb` (`isValidHexColor`)
  before save; invalid values surface a `Field` error and a toast.

State plumbing:
- `settingsDefaults.js` extends `DEFAULT_SETTINGS.company` with
  `primaryBrandColor: ""`, `logoUrl: ""`, and `logo: null` so `mergeSettings`
  preserves them when reading from the server.
- `SettingsScreen.handleSave` calls `stripServerOnlyBranding(draft)` before
  `save()` so the PATCH body only carries `company.primaryBrandColor` (logo
  fields are server-managed via the upload/delete endpoints). Reset to
  defaults uses the same stripper.
- After upload/remove, the screen calls `refresh()` and re-merges the result
  into the local draft so the new `logoUrl` shows immediately.

Shared helpers in `settingsFormat.js`:
- `getBrandColor(settings)` — returns the validated hex or `""`.
- `getLogoUrl(settings)` — prefers `company.logoUrl`, falls back to
  `company.logo.url` / `company.logo.dataUrl`.
- `getCompanyInitials(settings)` — up to two initials from display/legal name.
- `isValidHexColor(value)` — `#rgb` / `#rrggbb` regex check.

Propagation:
- **AppShell sidebar** (`components/layout/AppShell.jsx`) reads
  `useAppSettings()` and renders `<img class="brand-logo">` when a logo is
  configured, otherwise the existing `.brand-mark` initials tile tinted with
  the brand color. The brand strong-text now reflects the workspace
  display/legal name (falls back to "SupplyLink").
- **Invoice print** (`buildInvoicePrintHtml(document, branding)`) accepts a
  `{ brandColor, logoUrl }` branding object. The header now shows the vendor
  logo next to the vendor block, paints the title in the brand color, and
  uses it as the accent border under the header and above the grand-total
  row. Hex values are HTML-escaped before interpolation.

Constraints respected:
- Backend untouched; only existing endpoints used.
- Legacy `.settings-logo-placeholder` styles preserved and reused inside the
  new `.settings-logo-tile`.
- All buttons follow the existing busy-text pattern (`Uploading…`,
  `Removing…`) and use shared `secondary-button` / `primary-button` classes.

## Module 20AN — UX & Responsiveness Cleanup

Targeted, additive polish on the existing surfaces — no redesign, no
backend changes. All rules live at the bottom of `client/src/styles/index.css`
in a clearly delimited block so they win the cascade.

Form grids
- `.form-grid` is now an explicit responsive system instead of an
  unbounded `auto-fit`:
  - Desktop (≥ 1081 px): 3 columns max.
  - Tablet (721–1080 px): 2 columns.
  - Mobile (≤ 720 px): single column.
- Applies everywhere the shared grid is used (Settings, all create/edit
  forms, route template modal).

Modals
- `.form-panel` widened to `min(820px, 100%)` with consistent 24 px
  padding (18 px on mobile).
- On screens ≤ 720 px, every grid inside a modal (`.form-grid`,
  `.route-template-stop-grid`, `.route-stop-grid`, `.weekday-picker`)
  collapses to a single column so fields never get crushed side-by-side.
- Modal heading row wraps if the title + close button can't fit.
- Existing `align-items: flex-end` on the backdrop already turns the
  modal into a bottom sheet on phones; preserved.

Settings page
- `.resource-page` and `.dashboard-page` now have `max-width: 1200px`
  with `margin-inline: auto` for readability on wide displays.
- Company info reuses the new 3 / 2 / 1 grid automatically.
- `.settings-company-row` stacks the logo tile on top of the upload /
  remove controls on small screens, with the tile aligned to the start
  rather than stretching.
- `.brand-color-row` is capped at 360 px so the swatch + hex input +
  Clear button stay compact instead of stretching across the panel; it
  also wraps when needed.

Buttons & overflow
- `.button-row` and `.form-actions` always allow flex-wrapping, so
  primary / secondary action pairs never overflow narrow modals.
- Long values in detail fields, resource rows, record rows, and
  notification items wrap with `overflow-wrap: anywhere`.
- `.table-scroll` and `.resource-table` keep `max-width: 100%` +
  `overflow-x: auto` so wide tables scroll horizontally inside their
  container instead of pushing the page.

Verification
- `npm run lint`: clean.
- `npm run build`: 413.00 kB JS / 112.62 kB gzipped, 54.16 kB CSS /
  10.15 kB gzipped.
