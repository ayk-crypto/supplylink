import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateWith, formatMoneyWith } from "../system/settingsFormat.js";
import { useDashboardData } from "./useDashboardData.js";

function KpiCard({ tone, label, value, hint, icon, trend }) {
  return (
    <article className="kpi-card" data-tone={tone || "neutral"}>
      <div className="kpi-card-head">
        <span className="kpi-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="kpi-card-label">{label}</span>
      </div>
      <strong className="kpi-card-value">{value}</strong>
      <div className="kpi-card-foot">
        {hint ? <small>{hint}</small> : null}
        {trend ? <span className={`kpi-card-trend tone-${trend.tone}`}>{trend.label}</span> : null}
      </div>
    </article>
  );
}

const ICONS = {
  revenue: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3v14" />
      <path d="M13.5 6.5c-.7-1-2.1-1.5-3.5-1.5s-3 .7-3 2.2c0 1.5 1.5 2 3.3 2.4 1.7.4 3.2 1 3.2 2.5 0 1.5-1.6 2.4-3.5 2.4-1.5 0-3-.6-3.5-1.7" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="7.5" r="2.7" />
      <path d="M2.5 16.5c.7-2.5 3-4 5.5-4s4.8 1.5 5.5 4" />
      <circle cx="14.5" cy="6.5" r="2" />
      <path d="M13.5 11.5c2 .2 3.7 1.4 4.3 3.3" />
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 2.5h7l3 3V17l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1L5 17V2.5z" />
      <path d="M7.5 7.5h5M7.5 10h5M7.5 12.5h3" />
    </svg>
  ),
  outstanding: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2" />
    </svg>
  ),
  subscriptions: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 12a6.5 6.5 0 0 1 11-4.7l1.5 1.5" />
      <path d="M16 4v4h-4" />
      <path d="M16.5 8a6.5 6.5 0 0 1-11 4.7L4 11.2" />
      <path d="M4 16v-4h4" />
    </svg>
  )
};

function activityTypeLabel(type) {
  switch (type) {
    case "quotation":
      return "Quotation";
    case "order":
      return "Order";
    case "invoice":
      return "Invoice";
    case "payment":
      return "Payment";
    default:
      return "Record";
  }
}

function DashboardStatus({ type, status }) {
  if (type === "payment") {
    return <span className="dashboard-inline-badge">Recorded</span>;
  }
  if (type === "quotation") {
    return <StatusPill kind="quotation" status={status} />;
  }
  return <StatusPill kind={type === "invoice" ? "invoice" : "order"} status={status} />;
}

function ActivityFeed({ formatDate, formatMoney, items, navigate }) {
  if (!items?.length) {
    return <EmptyState>No recent commercial activity yet.</EmptyState>;
  }
  return (
    <div className="dashboard-activity-feed">
      {items.map((item) => (
        <article
          className="dashboard-activity-row"
          data-type={item.type}
          key={`${item.type}-${item.id}`}
        >
          <div className="dashboard-activity-main">
            <span className="dashboard-type-chip" data-type={item.type}>
              {activityTypeLabel(item.type)}
            </span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.customer?.label || "No customer linked"}</p>
            </div>
          </div>
          <div className="dashboard-activity-meta">
            <DashboardStatus status={item.status} type={item.type} />
            <strong>{formatMoney(item.amount || 0)}</strong>
            <span>{formatDate(item.date)}</span>
            {typeof navigate === "function" ? (
              <button
                className="link-button"
                onClick={() => {
                  if (item.type === "quotation") navigate(`/quotations/${item.id}`);
                  if (item.type === "order") navigate(`/orders/${item.id}`);
                  if (item.type === "invoice") navigate(`/invoices/${item.id}`);
                  if (item.type === "payment") navigate("/reports/payments");
                }}
                type="button"
              >
                Open
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function OverdueInvoices({ formatDate, formatMoney, items, navigate }) {
  if (!items?.length) {
    return <EmptyState>No overdue invoices right now.</EmptyState>;
  }
  return (
    <div className="dashboard-overdue-list">
      {items.map((invoice) => {
        const severity =
          invoice.daysOverdue >= 30
            ? "critical"
            : invoice.daysOverdue >= 14
              ? "high"
              : "warning";
        return (
          <article
            className="dashboard-overdue-row"
            data-severity={severity}
            key={invoice.id}
          >
            <div>
              <div className="dashboard-overdue-title">
                <strong>{invoice.label}</strong>
                <span className="dashboard-overdue-badge" data-severity={severity}>
                  {invoice.daysOverdue} day{invoice.daysOverdue === 1 ? "" : "s"} overdue
                </span>
              </div>
              <p>{invoice.customer?.label || "No customer"}</p>
              <span>Due {formatDate(invoice.dueDate)}</span>
            </div>
            <div className="dashboard-overdue-meta">
              <strong>{formatMoney(invoice.balanceDue)}</strong>
              {typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  type="button"
                >
                  Review
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TopCustomers({ formatDate, formatMoney, items, navigate }) {
  if (!items?.length) {
    return <EmptyState>No customer billing data yet.</EmptyState>;
  }
  return (
    <div className="dashboard-customer-list">
      {items.map((customer, index) => (
        <article className="dashboard-customer-row" key={customer.id}>
          <div className="dashboard-customer-rank">{index + 1}</div>
          <div className="dashboard-customer-main">
            <strong>{customer.label}</strong>
            <p>{customer.secondaryText || `${customer.invoiceCount} invoices posted`}</p>
            <span>
              Collected {formatMoney(customer.collectedTotal)} | Outstanding{" "}
              {formatMoney(customer.outstandingTotal)}
            </span>
            {customer.lastPaymentDate ? (
              <span>Last payment {formatDate(customer.lastPaymentDate)}</span>
            ) : (
              <span>No payments recorded yet</span>
            )}
          </div>
          <div className="dashboard-customer-meta">
            <strong>{formatMoney(customer.billedTotal)}</strong>
            <small>Billed total</small>
            {typeof navigate === "function" ? (
              <button
                className="link-button"
                onClick={() => navigate(`/customers/${customer.id}`)}
                type="button"
              >
                Open
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function PaymentsList({ formatDate, formatMoney, items, navigate }) {
  if (!items?.length) {
    return <EmptyState>No payments have been recorded yet.</EmptyState>;
  }
  return (
    <div className="dashboard-payment-list">
      {items.map((payment) => (
        <article className="dashboard-payment-row" key={payment.id}>
          <div>
            <strong>{payment.customer?.label || payment.label}</strong>
            <p>
              {payment.invoice?.invoiceNumber
                ? `Invoice ${payment.invoice.invoiceNumber}`
                : "General payment"}
            </p>
            <span>{formatDate(payment.paymentDate)}</span>
          </div>
          <div className="dashboard-payment-meta">
            <strong>{formatMoney(payment.amount)}</strong>
            <small>{payment.paymentMethod || "Payment"}</small>
            {typeof navigate === "function" ? (
              <button
                className="link-button"
                onClick={() => navigate("/reports/payments")}
                type="button"
              >
                View all
              </button>
            ) : null}
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
    <div className="dashboard-notification-list">
      {notifications.latest.slice(0, 4).map((notification) => (
        <article className="dashboard-notification-row" key={notification.id}>
          <span className={notification.isRead ? "read-dot read" : "read-dot"} />
          <div className="dashboard-notification-body">
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function HeaderActions({ navigate }) {
  if (typeof navigate !== "function") return null;
  return (
    <div className="button-row dashboard-header-actions">
      <button className="secondary-button compact" onClick={() => navigate("/orders/new")} type="button">
        New order
      </button>
      <button className="secondary-button compact" onClick={() => navigate("/invoices/new")} type="button">
        New invoice
      </button>
      <button className="primary-button compact" onClick={() => navigate("/quotations/new")} type="button">
        New quotation
      </button>
    </div>
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
  const formatDate = (value) => formatDateWith(settings, value);

  if (isLoading) {
    return (
      <div className="dashboard-page dashboard-v2">
        <PageHeader eyebrow="Dashboard" title="Loading dashboard" />
        <section className="dashboard-kpi-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="kpi-card kpi-card-skeleton" key={index}>
              <LoadingSkeleton rows={2} />
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const summary = dashboard.summaryCards || {};
  const aggregates = dashboard.aggregates || {};
  const topCustomers = dashboard.insights?.topCustomers || [];
  const overdueInvoices = dashboard.insights?.overdueInvoices || [];
  const recentPayments = dashboard.insights?.recentPayments || [];
  const overdueCount = aggregates.receivables?.overdueInvoiceCount ?? overdueInvoices.length;
  const openInvoiceCount = aggregates.receivables?.openInvoiceCount ?? 0;

  return (
    <div className="dashboard-page dashboard-v2">
      <PageHeader
        eyebrow={dashboard.vendor?.label || "Workspace"}
        title="Business performance at a glance"
        description="Track cash collected, unpaid invoices, customer momentum, and the latest sales activity."
        action={<HeaderActions navigate={navigate} />}
      />

      <section className="dashboard-kpi-grid" aria-label="Key metrics">
        <KpiCard
          tone="success"
          icon={ICONS.revenue}
          label="Revenue"
          value={formatMoney(summary.revenueCollected || 0)}
          hint={
            summary.outstandingReceivables > 0
              ? `${formatMoney(summary.outstandingReceivables)} outstanding`
              : "Everything collected"
          }
        />
        <KpiCard
          tone="info"
          icon={ICONS.customers}
          label="Customers"
          value={String(summary.totalCustomers || 0)}
          hint="Linked to this workspace"
        />
        <KpiCard
          tone="violet"
          icon={ICONS.invoices}
          label="Invoices"
          value={String(summary.totalInvoices || 0)}
          hint={`${openInvoiceCount} open · ${overdueCount} overdue`}
        />
        <KpiCard
          tone="neutral"
          icon={ICONS.subscriptions}
          label="Subscriptions"
          value="—"
          hint="Not available on this workspace"
        />
      </section>

      <section className="dashboard-insights-grid">
        <div className="panel-block dashboard-wide-panel">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button className="link-button" onClick={() => navigate("/reports")} type="button">
                  Open reports
                </button>
              ) : null
            }
            hint="Quotations, orders, invoices, and payments"
            title="Recent activity"
          />
          <ActivityFeed
            formatDate={formatDate}
            formatMoney={formatMoney}
            items={(dashboard.recent?.activity || []).slice(0, 4)}
            navigate={navigate}
          />
        </div>

        <div className="panel-block">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/reports/receivables")}
                  type="button"
                >
                  Receivables
                </button>
              ) : null
            }
            hint={`${overdueInvoices.length} shown`}
            title="Overdue invoices"
          />
          <OverdueInvoices
            formatDate={formatDate}
            formatMoney={formatMoney}
            items={overdueInvoices}
            navigate={navigate}
          />
        </div>

        <div className="panel-block">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button className="link-button" onClick={() => navigate("/customers")} type="button">
                  Customers
                </button>
              ) : null
            }
            hint="Ranked by billed value"
            title="Top customers"
          />
          <TopCustomers
            formatDate={formatDate}
            formatMoney={formatMoney}
            items={topCustomers}
            navigate={navigate}
          />
        </div>

        <div className="panel-block">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/reports/payments")}
                  type="button"
                >
                  Payments
                </button>
              ) : null
            }
            hint={`${recentPayments.length} recent`}
            title="Recent payments"
          />
          <PaymentsList
            formatDate={formatDate}
            formatMoney={formatMoney}
            items={recentPayments}
            navigate={navigate}
          />
        </div>

        <div className="panel-block">
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
