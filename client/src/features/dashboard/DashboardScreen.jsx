import { EmptyState, ErrorState, LoadingSkeleton, SectionHeader } from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useAppSettings } from "../system/settingsContext.js";
import { formatMoneyWith } from "../system/settingsFormat.js";
import { useDashboardData } from "./useDashboardData.js";

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

function MetricCard({ detail, glyph, label, value }) {
  return (
    <article className="metric-tile">
      <div className="metric-tile-head">
        <span>{label}</span>
        <MetricIcon glyph={glyph} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function RecordList({ emptyLabel, formatMoney, items, kind }) {
  if (!items?.length) {
    return <EmptyState>{emptyLabel}</EmptyState>;
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
            <StatusPill kind={kind === "invoice" ? "invoice" : "order"} status={item.status} />
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

function NotificationsList({ notifications }) {
  if (!notifications?.latest?.length) {
    return <EmptyState>No recent notifications.</EmptyState>;
  }

  return (
    <div className="notification-list">
      {notifications.latest.map((notification) => (
        <article className="notification-row" key={notification.id}>
          <span className={notification.isRead ? "read-dot read" : "read-dot"} />
          <div>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function QuickActions({ navigate }) {
  if (typeof navigate !== "function") {
    return null;
  }
  const actions = [
    { label: "New order", path: "/orders/new", tone: "primary" },
    { label: "New invoice", path: "/invoices/new", tone: "primary" },
    { label: "Adjust stock", path: "/inventory", tone: "secondary" },
    { label: "View notifications", path: "/notifications", tone: "secondary" },
    { label: "Audit history", path: "/audit", tone: "secondary" }
  ];
  return (
    <section aria-label="Quick actions" className="quick-actions">
      {actions.map((action) => (
        <button
          className={`${action.tone}-button`}
          key={action.path}
          onClick={() => navigate(action.path)}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </section>
  );
}

function DashboardScreen({ navigate }) {
  const {
    areNotificationsLoading,
    dashboard,
    error,
    isLoading,
    notifications,
    notificationsError
  } = useDashboardData();
  const { settings } = useAppSettings();
  const formatMoney = (value) => formatMoneyWith(settings, value);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-hero">
          <LoadingSkeleton label="Loading dashboard" rows={4} />
        </section>
        <section className="metric-strip">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="metric-tile" key={index}>
              <LoadingSkeleton rows={3} />
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const collectedRatio = (() => {
    const invoiceTotal = Number(dashboard.receivables.invoiceTotal || 0);
    const paymentTotal = Number(dashboard.receivables.paymentTotal || 0);

    if (invoiceTotal <= 0) {
      return null;
    }

    return Math.min(100, Math.round((paymentTotal / invoiceTotal) * 100));
  })();

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Today&apos;s operating picture</h2>
          <p>
            See sales activity, money owed, deliveries in motion, and team updates — all in one
            place.
          </p>
        </div>
        <div className="receivables-card">
          <span>Outstanding receivables</span>
          <strong>{formatMoney(dashboard.receivables.outstanding)}</strong>
          <small>
            {formatMoney(dashboard.receivables.paymentTotal)} received against{" "}
            {formatMoney(dashboard.receivables.invoiceTotal)} invoiced
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

      <QuickActions navigate={navigate} />

      <section className="metric-strip">
        <MetricCard
          detail="Active customers in your book"
          glyph="customers"
          label="Customers"
          value={dashboard.metrics.totalCustomers}
        />
        <MetricCard
          detail="Orders in flight, including drafts"
          glyph="orders"
          label="Orders"
          value={dashboard.metrics.totalOrders}
        />
        <MetricCard
          detail={formatMoney(dashboard.metrics.invoiceTotal)}
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

      <section className="dashboard-columns">
        <div className="panel-block">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/orders")}
                  type="button"
                >
                  Open orders
                </button>
              ) : null
            }
            title="Recent Orders"
          />
          <RecordList
            emptyLabel="No recent orders."
            formatMoney={formatMoney}
            items={dashboard.recent.orders}
            kind="order"
          />
        </div>

        <div className="panel-block">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/invoices")}
                  type="button"
                >
                  Open invoices
                </button>
              ) : null
            }
            title="Recent Invoices"
          />
          <RecordList
            emptyLabel="No recent invoices."
            formatMoney={formatMoney}
            items={dashboard.recent.invoices}
            kind="invoice"
          />
        </div>

        <div className="panel-block notifications-panel">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/notifications")}
                  type="button"
                >
                  Open inbox
                </button>
              ) : null
            }
            hint={areNotificationsLoading ? "Loading" : `${notifications?.unreadCount || 0} unread`}
            title="Notifications"
          />
          {notificationsError ? (
            <ErrorState message={notificationsError} />
          ) : areNotificationsLoading && !notifications ? (
            <LoadingSkeleton label="Loading notifications" rows={3} />
          ) : (
            <NotificationsList notifications={notifications} />
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardScreen;
