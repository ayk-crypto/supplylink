import { INVOICE_STATUS_KEYS, ORDER_STATUS_KEYS, useDashboardData } from "./useDashboardData.js";

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

const ORDER_STATUS_LABELS = {
  draft: "Draft",
  confirmed: "Confirmed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

const INVOICE_STATUS_LABELS = {
  draft: "Draft",
  issued: "Issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  void: "Void"
};

const RELATED_ENTITY_PATHS = {
  order: (id) => `/orders/${id}`,
  invoice: (id) => `/invoices/${id}`,
  quotation: (id) => `/quotations/${id}`,
  customer: (id) => `/ledger/customers/${id}`,
  product: (id) => `/inventory/products/${id}`,
  inventory_product: (id) => `/inventory/products/${id}`,
  payment: () => "/invoices"
};

function relatedEntityHref(notification) {
  if (!notification?.relatedEntityType || !notification?.relatedEntityId) {
    return null;
  }
  const builder = RELATED_ENTITY_PATHS[notification.relatedEntityType];
  return builder ? builder(notification.relatedEntityId) : null;
}

function MetricIcon({ glyph }) {
  const paths = {
    customers: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 18c.7-2.6 2.9-4.2 5.5-4.2s4.8 1.6 5.5 4.2" />
        <circle cx="16.5" cy="9" r="2.4" />
        <path d="M14.5 14.5c2.5 0 4.4 1.4 5 3.5" />
      </>
    ),
    orders: (
      <>
        <path d="M4 6h13l-1.4 8.4a2 2 0 0 1-2 1.6H8a2 2 0 0 1-2-1.6L4 6Z" />
        <path d="M4 6 3 3H1.5" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="15" cy="20" r="1.4" />
      </>
    ),
    invoices: (
      <>
        <path d="M6 3h9l3 3v15H6Z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </>
    ),
    routes: (
      <>
        <path d="M5 19c3-1 4-4 4-7s-1-6-4-7" />
        <path d="M19 5c-3 1-4 4-4 7s1 6 4 7" />
        <circle cx="5" cy="19" r="1.4" />
        <circle cx="19" cy="5" r="1.4" />
      </>
    ),
    inventory: (
      <>
        <path d="M3 7l8-4 8 4-8 4-8-4Z" />
        <path d="M3 7v8l8 4 8-4V7" />
        <path d="M11 11v8" />
      </>
    ),
    warning: (
      <>
        <path d="M11 3 2 19h18L11 3Z" />
        <path d="M11 9v5" />
        <circle cx="11" cy="17" r="0.8" />
      </>
    ),
    alert: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="M11 7v5" />
        <circle cx="11" cy="15.2" r="0.8" />
      </>
    )
  };

  return (
    <span aria-hidden="true" className="metric-icon">
      <svg
        fill="none"
        height="18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
        viewBox="0 0 22 22"
        width="18"
      >
        {paths[glyph] || null}
      </svg>
    </span>
  );
}

function MetricCard({ detail, glyph, label, value, tone }) {
  return (
    <article className={tone ? `metric-tile metric-tone-${tone}` : "metric-tile"}>
      <div className="metric-tile-head">
        <span>{label}</span>
        <MetricIcon glyph={glyph} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatusCountGrid({ counts, labels, statuses, emptyHint }) {
  const allLoaded = statuses.every((status) => counts && counts[status] !== undefined);
  if (!allLoaded) {
    return <p className="surface-message loading">Loading…</p>;
  }

  const allZero = statuses.every((status) => Number(counts[status] || 0) === 0);
  if (allZero && emptyHint) {
    return <p className="empty-state">{emptyHint}</p>;
  }

  return (
    <div className="status-count-grid">
      {statuses.map((status) => {
        const value = counts[status];
        return (
          <div className="status-count-cell" key={status}>
            <span className={`status-pill status-${status}`}>{labels[status] || status}</span>
            <strong>{value === null ? "—" : formatNumber(value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RecordList({ emptyLabel, items, kind }) {
  if (!items?.length) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="record-list">
      {items.map((item) => (
        <article className="record-row" key={item.id}>
          <div>
            <strong>{item.label}</strong>
            <span>{item.customer?.label || "No customer"}</span>
          </div>
          <div>
            <span className={`status-pill status-${item.status}`}>{item.status}</span>
            <small>
              {kind === "invoice"
                ? formatMoney(item.balanceDue)
                : formatMoney(item.grandTotal)}
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}

function NotificationsList({ notifications, onNavigate }) {
  if (!notifications?.latest?.length) {
    return <p className="empty-state">No recent notifications.</p>;
  }

  return (
    <div className="notification-list">
      {notifications.latest.map((notification) => {
        const href = relatedEntityHref(notification);
        return (
          <article className="notification-row" key={notification.id}>
            <span className={notification.isRead ? "read-dot read" : "read-dot"} />
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              {href && onNavigate ? (
                <button
                  className="link-button notification-link"
                  onClick={() => onNavigate(href)}
                  type="button"
                >
                  View related →
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function DashboardScreen({ navigate }) {
  const {
    areNotificationsLoading,
    dashboard,
    error,
    intelligence,
    intelligenceError,
    isIntelligenceLoading,
    isLoading,
    notifications,
    notificationsError
  } = useDashboardData();
  const currency = dashboard?.vendor?.currencyCode || "USD";

  if (isLoading) {
    return <p className="surface-message loading">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="surface-message error">{error}</p>;
  }

  const collectedRatio = (() => {
    const invoiceTotal = Number(dashboard.receivables.invoiceTotal || 0);
    const paymentTotal = Number(dashboard.receivables.paymentTotal || 0);

    if (invoiceTotal <= 0) {
      return null;
    }

    return Math.min(100, Math.round((paymentTotal / invoiceTotal) * 100));
  })();

  const inventory = intelligence?.inventory;
  const totalProducts = dashboard.metrics.totalProducts ?? inventory?.total ?? 0;
  const lowStockCount = inventory?.lowStock;
  const negativeStockCount = inventory?.negative;

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Today&apos;s operating picture</h2>
          <p>
            Keep an eye on sales flow, receivables, fulfillment, and team updates from one
            workspace.
          </p>
        </div>
        <div className="receivables-card">
          <span>Outstanding receivables</span>
          <strong>{formatMoney(dashboard.receivables.outstanding, currency)}</strong>
          <small>
            {formatMoney(dashboard.receivables.paymentTotal, currency)} received against{" "}
            {formatMoney(dashboard.receivables.invoiceTotal, currency)} invoiced
          </small>
          {collectedRatio !== null ? (
            <div
              aria-label={`${collectedRatio}% of invoiced amount collected`}
              className="receivables-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={collectedRatio}
            >
              <span style={{ width: `${collectedRatio}%` }} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="metric-strip">
        <MetricCard
          detail="Customers linked to this vendor"
          glyph="customers"
          label="Customers"
          value={dashboard.metrics.totalCustomers}
        />
        <MetricCard
          detail="Confirmed workflow volume"
          glyph="orders"
          label="Orders"
          value={dashboard.metrics.totalOrders}
        />
        <MetricCard
          detail={formatMoney(dashboard.metrics.invoiceTotal, currency)}
          glyph="invoices"
          label="Invoices"
          value={dashboard.metrics.totalInvoices}
        />
        <MetricCard
          detail="Routes planned and completed"
          glyph="routes"
          label="Routes"
          value={dashboard.metrics.totalRoutes}
        />
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-head">
          <div>
            <h3>Inventory health</h3>
            <p>Stock signals across the catalogue.</p>
          </div>
          <button
            className="secondary-button compact"
            onClick={() => navigate && navigate("/inventory")}
            type="button"
          >
            View inventory →
          </button>
        </div>
        {intelligenceError ? (
          <p className="surface-message error">{intelligenceError}</p>
        ) : (
          <div className="metric-strip">
            <MetricCard
              glyph="inventory"
              label="Total products"
              value={isIntelligenceLoading && totalProducts === 0 ? "…" : formatNumber(totalProducts)}
              detail={
                inventory?.isPartial
                  ? `Stock signals from latest ${inventory.sampledCount}`
                  : "Across the catalogue"
              }
            />
            <MetricCard
              glyph="warning"
              label="Low stock"
              tone={lowStockCount > 0 ? "warn" : null}
              value={
                isIntelligenceLoading && lowStockCount === undefined
                  ? "…"
                  : formatNumber(lowStockCount || 0)
              }
              detail="At or below 5 units"
            />
            <MetricCard
              glyph="alert"
              label="Negative stock"
              tone={negativeStockCount > 0 ? "danger" : null}
              value={
                isIntelligenceLoading && negativeStockCount === undefined
                  ? "…"
                  : formatNumber(negativeStockCount || 0)
              }
              detail="Below zero on hand"
            />
          </div>
        )}
      </section>

      <section className="dashboard-grid-two">
        <div className="panel-block">
          <div className="panel-heading">
            <h3>Orders by status</h3>
            <button
              className="link-button"
              onClick={() => navigate && navigate("/orders")}
              type="button"
            >
              Open orders →
            </button>
          </div>
          {intelligenceError ? (
            <p className="surface-message error">{intelligenceError}</p>
          ) : (
            <StatusCountGrid
              counts={intelligence?.orderCounts}
              labels={ORDER_STATUS_LABELS}
              statuses={ORDER_STATUS_KEYS}
              emptyHint="No orders recorded yet."
            />
          )}
        </div>

        <div className="panel-block">
          <div className="panel-heading">
            <h3>Invoices by status</h3>
            <button
              className="link-button"
              onClick={() => navigate && navigate("/invoices")}
              type="button"
            >
              Open invoices →
            </button>
          </div>
          {intelligenceError ? (
            <p className="surface-message error">{intelligenceError}</p>
          ) : (
            <StatusCountGrid
              counts={intelligence?.invoiceCounts}
              labels={INVOICE_STATUS_LABELS}
              statuses={INVOICE_STATUS_KEYS}
              emptyHint="No invoices recorded yet."
            />
          )}
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="panel-block">
          <div className="panel-heading">
            <h3>Recent orders</h3>
          </div>
          <RecordList emptyLabel="No recent orders." items={dashboard.recent.orders} kind="order" />
        </div>

        <div className="panel-block">
          <div className="panel-heading">
            <h3>Recent invoices</h3>
          </div>
          <RecordList
            emptyLabel="No recent invoices."
            items={dashboard.recent.invoices}
            kind="invoice"
          />
        </div>

        <div className="panel-block notifications-panel">
          <div className="panel-heading">
            <h3>Activity</h3>
            <span>
              {areNotificationsLoading ? "Loading" : `${notifications?.unreadCount || 0} unread`}
            </span>
          </div>
          {notificationsError ? (
            <p className="surface-message error">{notificationsError}</p>
          ) : areNotificationsLoading && !notifications ? (
            <p className="surface-message loading">Loading notifications...</p>
          ) : (
            <NotificationsList notifications={notifications} onNavigate={navigate} />
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardScreen;
