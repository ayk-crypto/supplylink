import { useDashboardData } from "./useDashboardData.js";

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency"
  }).format(Number(value || 0));
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
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
            <span className="status-pill">{item.status}</span>
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
    return <p className="empty-state">No recent notifications.</p>;
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

function DashboardScreen() {
  const {
    areNotificationsLoading,
    dashboard,
    error,
    isLoading,
    notifications,
    notificationsError
  } = useDashboardData();
  const currency = dashboard?.vendor?.currencyCode || "USD";

  if (isLoading) {
    return <p className="surface-message">Loading dashboard...</p>;
  }

  if (error) {
    return <p className="surface-message error">{error}</p>;
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Today's operating picture</h2>
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
        </div>
      </section>

      <section className="metric-strip">
        <MetricCard
          detail="Customers linked to this vendor"
          label="Customers"
          value={dashboard.metrics.totalCustomers}
        />
        <MetricCard
          detail="Confirmed workflow volume"
          label="Orders"
          value={dashboard.metrics.totalOrders}
        />
        <MetricCard
          detail={formatMoney(dashboard.metrics.invoiceTotal, currency)}
          label="Invoices"
          value={dashboard.metrics.totalInvoices}
        />
        <MetricCard
          detail="Routes planned and completed"
          label="Routes"
          value={dashboard.metrics.totalRoutes}
        />
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
            <h3>Notifications</h3>
            <span>
              {areNotificationsLoading ? "Loading" : `${notifications?.unreadCount || 0} unread`}
            </span>
          </div>
          {notificationsError ? (
            <p className="surface-message error">{notificationsError}</p>
          ) : areNotificationsLoading && !notifications ? (
            <p className="surface-message">Loading notifications...</p>
          ) : (
            <NotificationsList notifications={notifications} />
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardScreen;
