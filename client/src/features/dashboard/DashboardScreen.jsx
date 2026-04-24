import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateWith, formatMoneyWith } from "../system/settingsFormat.js";
import { useDashboardData } from "./useDashboardData.js";

function SummaryCard({ accent, detail, icon, label, tone, value }) {
  return (
    <article
      className="dashboard-summary-card"
      data-tone={tone || "neutral"}
      style={accent ? { "--dashboard-accent": accent } : undefined}
    >
      <div className="dashboard-summary-head">
        <span className="dashboard-summary-icon" aria-hidden="true">
          {icon || "."}
        </span>
        <span className="dashboard-summary-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="dashboard-hero-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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

function QuickActions({ navigate }) {
  if (typeof navigate !== "function") {
    return null;
  }

  const actions = [
    { label: "New quotation", path: "/quotations/new", tone: "primary" },
    { label: "New order", path: "/orders/new", tone: "primary" },
    { label: "New invoice", path: "/invoices/new", tone: "secondary" },
    { label: "Receivables report", path: "/reports/receivables", tone: "secondary" }
  ];

  return (
    <section aria-label="Quick actions" className="quick-actions dashboard-quick-actions">
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
  const formatDate = (value) => formatDateWith(settings, value);

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-insights-hero">
          <LoadingSkeleton label="Loading dashboard" rows={4} />
        </section>
        <section className="dashboard-summary-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="dashboard-summary-card" key={index}>
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

  const summary = dashboard.summaryCards || {};
  const topCustomers = dashboard.insights?.topCustomers || [];
  const overdueInvoices = dashboard.insights?.overdueInvoices || [];
  const recentPayments = dashboard.insights?.recentPayments || [];

  return (
    <div className="dashboard-page dashboard-insights-page">
      <section className="dashboard-insights-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Business performance at a glance</h2>
          <p>
            Track cash collected, unpaid invoices, customer momentum, and the latest sales activity
            without leaving the home screen.
          </p>
        </div>
        <div className="dashboard-hero-panel">
          <div className="dashboard-hero-panel-head">
            <span>{dashboard.vendor?.label || "Workspace"}</span>
            <strong>{formatMoney(summary.revenueCollected || 0)}</strong>
            <p>Revenue collected so far across recorded payments.</p>
          </div>
          <div className="dashboard-hero-stats">
            <HeroStat
              label="Outstanding receivables"
              value={formatMoney(summary.outstandingReceivables || 0)}
            />
            <HeroStat
              label="Overdue invoices"
              value={String(dashboard.aggregates?.receivables?.overdueInvoiceCount || 0)}
            />
            <HeroStat
              label="Open invoices"
              value={String(dashboard.aggregates?.receivables?.openInvoiceCount || 0)}
            />
          </div>
        </div>
      </section>

      <QuickActions navigate={navigate} />

      <section className="dashboard-summary-grid">
        <SummaryCard
          tone="success"
          icon="$"
          detail="Total revenue collected"
          label="Revenue collected"
          value={formatMoney(summary.revenueCollected || 0)}
        />
        <SummaryCard
          tone="warning"
          icon="AR"
          detail="Unpaid issued invoice balance"
          label="Outstanding receivables"
          value={formatMoney(summary.outstandingReceivables || 0)}
        />
        <SummaryCard
          tone="info"
          icon="CU"
          detail="Linked customers"
          label="Customers"
          value={String(summary.totalCustomers || 0)}
        />
        <SummaryCard
          tone="violet"
          icon="QT"
          detail="Quotations created"
          label="Quotations"
          value={String(summary.totalQuotations || 0)}
        />
        <SummaryCard
          tone="teal"
          icon="OR"
          detail="Orders across all statuses"
          label="Orders"
          value={String(summary.totalOrders || 0)}
        />
        <SummaryCard
          tone="rose"
          icon="IV"
          detail="Invoices issued so far"
          label="Invoices"
          value={String(summary.totalInvoices || 0)}
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
            items={(dashboard.recent?.activity || []).slice(0, 3)}
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
