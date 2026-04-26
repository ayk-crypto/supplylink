import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { listAdminVendors } from "../../services/adminVendorsApi.js";
import {
  listAdminSubscriptions,
  listBillingPayments,
  listBillingPlans
} from "../../services/adminBillingApi.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateWith, formatMoneyWith } from "../system/settingsFormat.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";

const VENDORS_PAGE_SIZE = 25;
const SUBS_PAGE_SIZE = 100;
const PAYMENTS_PAGE_SIZE = 100;

const PLAN_LABELS = { free: "Free", basic: "Basic", pro: "Pro", custom: "Custom" };
const PLAN_TONES = {
  free: "neutral",
  basic: "info",
  pro: "violet",
  custom: "success"
};
const VENDOR_STATUS_TONES = {
  active: "success",
  draft: "neutral",
  suspended: "danger",
  archived: "warning"
};
const PAYMENT_STATUS_TONES = {
  received: "success",
  pending: "warning",
  refunded: "neutral",
  failed: "danger"
};

const ICONS = {
  vendors: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 17V8.5l6.5-4 6.5 4V17" />
      <path d="M3.5 17h13" />
      <path d="M8 17v-4h4v4" />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M7 10.5l2 2 4-4.5" />
    </svg>
  ),
  trial: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2" />
    </svg>
  ),
  paid: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="14" height="11" rx="2" />
      <path d="M3 9h14" />
      <path d="M7 13h3" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3v14" />
      <path d="M13.5 6.5c-.7-1-2.1-1.5-3.5-1.5s-3 .7-3 2.2c0 1.5 1.5 2 3.3 2.4 1.7.4 3.2 1 3.2 2.5 0 1.5-1.6 2.4-3.5 2.4-1.5 0-3-.6-3.5-1.7" />
    </svg>
  )
};

function formatToken(value) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function planLabel(code) {
  if (!code) return "—";
  return PLAN_LABELS[code] || formatToken(code);
}

function billingCycleLabel(cycle) {
  if (cycle === "annual") return "Annual";
  if (cycle === "monthly") return "Monthly";
  return cycle ? formatToken(cycle) : "—";
}

function getSubscriptionStatus(sub) {
  return sub?.subscriptionStatus || sub?.status || null;
}

function getSubscriptionPlan(sub) {
  return sub?.currentPlan || sub?.basePlan || null;
}

function KpiCard({ tone, label, value, hint, icon }) {
  return (
    <article className="kpi-card" data-tone={tone || "neutral"}>
      <div className="kpi-card-head">
        <span className="kpi-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="kpi-card-label">{label}</span>
      </div>
      <strong className="kpi-card-value">{value}</strong>
      <div className="kpi-card-foot">{hint ? <small>{hint}</small> : null}</div>
    </article>
  );
}

function HeaderActions({ navigate }) {
  if (typeof navigate !== "function") return null;
  return (
    <div className="button-row admin-dashboard-header-actions">
      <button
        className="secondary-button compact"
        onClick={() => navigate("/admin/billing")}
        type="button"
      >
        Admin Billing
      </button>
      <button
        className="primary-button compact"
        onClick={() => navigate("/admin/vendors")}
        type="button"
      >
        + Create Vendor
      </button>
    </div>
  );
}

function RecentSignups({ formatDate, items, navigate }) {
  if (!items?.length) {
    return (
      <EmptyState
        title="No vendors yet"
        action={
          typeof navigate === "function" ? (
            <button
              className="primary-button compact"
              onClick={() => navigate("/admin/vendors")}
              type="button"
            >
              Create first vendor
            </button>
          ) : null
        }
      >
        New vendors will appear here as soon as you onboard one.
      </EmptyState>
    );
  }
  return (
    <div className="admin-dashboard-signup-list">
      {items.map((vendor) => {
        const planCode = vendor.plan || "free";
        const statusTone = VENDOR_STATUS_TONES[vendor.status] || "neutral";
        return (
          <article className="admin-dashboard-signup-row" key={vendor.id}>
            <div className="admin-dashboard-signup-main">
              <div className="admin-dashboard-signup-avatar" aria-hidden="true">
                {(vendor.displayName || vendor.legalName || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{vendor.displayName || vendor.legalName || "Untitled vendor"}</strong>
                <p>{vendor.adminUser?.email || vendor.contactEmail || "No admin assigned"}</p>
              </div>
            </div>
            <div className="admin-dashboard-signup-meta">
              <span className="admin-dashboard-plan-pill" data-tone={PLAN_TONES[planCode] || "neutral"}>
                {planLabel(planCode)}
              </span>
              <StatusPill
                label={formatToken(vendor.status)}
                status={vendor.status}
                tone={statusTone}
              />
              <span className="admin-dashboard-row-time">
                {vendor.createdAt ? formatDate(vendor.createdAt) : "—"}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RecentPayments({ formatDate, formatMoney, items, navigate }) {
  if (!items?.length) {
    return (
      <EmptyState
        title="No payments recorded"
        action={
          typeof navigate === "function" ? (
            <button
              className="primary-button compact"
              onClick={() => navigate("/admin/billing")}
              type="button"
            >
              Record payment
            </button>
          ) : null
        }
      >
        Manual subscription payments captured in Admin Billing will show up here.
      </EmptyState>
    );
  }
  return (
    <div className="admin-dashboard-payment-list">
      {items.map((payment) => {
        const statusTone = PAYMENT_STATUS_TONES[payment.paymentStatus] || "neutral";
        const planCode = payment.planCode || "free";
        return (
          <article className="admin-dashboard-payment-row" key={payment.id}>
            <div className="admin-dashboard-payment-main">
              <div className="admin-dashboard-payment-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v14" />
                  <path d="M13.5 6.5c-.7-1-2.1-1.5-3.5-1.5s-3 .7-3 2.2c0 1.5 1.5 2 3.3 2.4 1.7.4 3.2 1 3.2 2.5 0 1.5-1.6 2.4-3.5 2.4-1.5 0-3-.6-3.5-1.7" />
                </svg>
              </div>
              <div>
                <strong>{payment.vendor?.displayName || "Vendor"}</strong>
                <p>
                  {planLabel(planCode)} · {billingCycleLabel(payment.billingCycle)}
                </p>
              </div>
            </div>
            <div className="admin-dashboard-payment-meta">
              <strong className="admin-dashboard-payment-amount">
                {payment.currency
                  ? `${payment.currency} ${Number(payment.amount || 0).toLocaleString()}`
                  : formatMoney(Number(payment.amount || 0))}
              </strong>
              <StatusPill
                label={formatToken(payment.paymentStatus)}
                status={payment.paymentStatus}
                tone={statusTone}
              />
              <span className="admin-dashboard-row-time">
                {formatDate(payment.paidAt || payment.createdAt)}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function VendorTable({ formatDate, rows, navigate, totalVendors }) {
  if (!rows?.length) {
    return (
      <EmptyState title="No vendors to show">
        Once vendors are onboarded they will appear in this list with their current plan and
        billing cycle.
      </EmptyState>
    );
  }
  return (
    <div className="admin-dashboard-vendor-table-wrapper">
      <table className="admin-dashboard-vendor-table">
        <thead>
          <tr>
            <th scope="col">Vendor</th>
            <th scope="col">Plan</th>
            <th scope="col">Status</th>
            <th scope="col">Billing cycle</th>
            <th scope="col">Period end</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const planCode = row.plan || "free";
            const statusTone = VENDOR_STATUS_TONES[row.status] || "neutral";
            return (
              <tr key={row.id}>
                <td>
                  <div className="admin-dashboard-vendor-cell">
                    <div className="admin-dashboard-signup-avatar" aria-hidden="true">
                      {(row.name || "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{row.name || "Untitled vendor"}</strong>
                      {row.slug ? <small>{row.slug}</small> : null}
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="admin-dashboard-plan-pill"
                    data-tone={PLAN_TONES[planCode] || "neutral"}
                  >
                    {planLabel(planCode)}
                  </span>
                </td>
                <td>
                  <StatusPill
                    label={formatToken(row.status)}
                    status={row.status}
                    tone={statusTone}
                  />
                </td>
                <td>{billingCycleLabel(row.billingCycle)}</td>
                <td>{row.periodEnd ? formatDate(row.periodEnd) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalVendors > rows.length && typeof navigate === "function" ? (
        <div className="admin-dashboard-vendor-table-foot">
          <button
            className="link-button"
            onClick={() => navigate("/admin/vendors")}
            type="button"
          >
            View all {totalVendors} vendors →
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AdminDashboardScreen({ navigate }) {
  const { settings } = useAppSettings();
  const formatMoney = (value) => formatMoneyWith(settings, value);
  const formatDate = (value) => formatDateWith(settings, value);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    totalVendors: 0,
    activeVendors: 0,
    vendors: [],
    plans: [],
    subscriptions: [],
    subsTotal: 0,
    payments: [],
    paymentsTotal: 0
  });

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [
        vendorsResp,
        activeVendorsResp,
        subsResp,
        paymentsResp,
        plansResp
      ] = await Promise.all([
        listAdminVendors({ page: 1, pageSize: VENDORS_PAGE_SIZE }),
        listAdminVendors({ page: 1, pageSize: 1, status: "active" }),
        listAdminSubscriptions({ page: 1, pageSize: SUBS_PAGE_SIZE }),
        listBillingPayments({ page: 1, pageSize: PAYMENTS_PAGE_SIZE }),
        listBillingPlans()
      ]);

      const vendors = vendorsResp?.data?.items || [];
      const totalVendors = vendorsResp?.data?.pagination?.totalItems ?? vendors.length;
      const activeVendors =
        activeVendorsResp?.data?.pagination?.totalItems ??
        (activeVendorsResp?.data?.items || []).length;
      const subscriptions = subsResp?.data?.items || [];
      const subsTotal = subsResp?.data?.pagination?.totalItems ?? subscriptions.length;
      const payments = paymentsResp?.data?.items || [];
      const paymentsTotal = paymentsResp?.data?.pagination?.totalItems ?? payments.length;
      const plans = Array.isArray(plansResp?.data) ? plansResp.data : [];

      setData({
        totalVendors,
        activeVendors,
        vendors,
        plans,
        subscriptions,
        subsTotal,
        payments,
        paymentsTotal
      });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "The platform dashboard could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const derived = useMemo(() => {
    const subs = data.subscriptions || [];
    let trialCount = 0;
    let paidCount = 0;

    subs.forEach((sub) => {
      const status = getSubscriptionStatus(sub);
      if (status === "trial") trialCount += 1;
      if (status === "active" || status === "past_due") paidCount += 1;
    });

    const payments = data.payments || [];
    const totalPaymentsAmount = payments
      .filter((p) => p.paymentStatus === "received")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const subscriptionByVendorId = new Map();
    subs.forEach((sub) => {
      const vendorId = sub?.vendor?.id;
      if (vendorId && !subscriptionByVendorId.has(vendorId)) {
        subscriptionByVendorId.set(vendorId, sub);
      }
    });

    const vendorRows = (data.vendors || []).map((vendor) => {
      const sub = subscriptionByVendorId.get(vendor.id);
      return {
        id: vendor.id,
        name: vendor.displayName || vendor.legalName || "Untitled vendor",
        slug: vendor.slug || null,
        plan: getSubscriptionPlan(sub) || vendor.plan || "free",
        status: vendor.status,
        billingCycle: sub?.billingCycle || null,
        periodEnd: sub?.currentPeriodEnd || sub?.expiresAt || null
      };
    });

    const subsTruncated = data.subsTotal > subs.length;
    const paymentsTruncated = data.paymentsTotal > payments.length;

    return {
      trialCount,
      paidCount,
      totalPaymentsAmount,
      vendorRows,
      subsTruncated,
      paymentsTruncated
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="dashboard-page dashboard-v2 admin-dashboard-page">
        <PageHeader eyebrow="Platform" title="Loading platform dashboard" />
        <section className="dashboard-kpi-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <article className="kpi-card kpi-card-skeleton" key={index}>
              <LoadingSkeleton rows={2} />
            </article>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page dashboard-v2 admin-dashboard-page">
        <PageHeader eyebrow="Platform" title="Platform Dashboard" />
        <ErrorState message={error} onRetry={loadDashboard} />
      </div>
    );
  }

  const trialHint = derived.trialCount > 0
    ? `${derived.trialCount} in trial phase`
    : "No trials in progress";

  const paidHint = derived.subsTruncated
    ? `Active or past-due in the first ${data.subscriptions.length}`
    : "Active or past-due subscriptions";

  const paymentsHintBase = derived.paymentsTruncated
    ? `From the first ${data.payments.length} of ${data.paymentsTotal} payments`
    : data.paymentsTotal === 0
      ? "No payments recorded yet"
      : `Across ${data.paymentsTotal} payment${data.paymentsTotal === 1 ? "" : "s"}`;

  const paymentsValuePrefix = derived.paymentsTruncated ? "≈ " : "";

  const inactiveVendors = Math.max(0, data.totalVendors - data.activeVendors);
  const activeVendorHint = data.totalVendors > 0
    ? `${data.activeVendors} active / ${inactiveVendors} inactive`
    : "Onboard a vendor to begin";

  return (
    <div className="dashboard-page dashboard-v2 admin-dashboard-page">
      <PageHeader
        eyebrow="Platform"
        title="Platform Dashboard"
        description="Manage vendors, subscriptions, and billing activity."
        action={<HeaderActions navigate={navigate} />}
      />

      <section className="dashboard-kpi-grid admin-dashboard-kpi-grid" aria-label="Platform metrics">
        <KpiCard
          tone="info"
          icon={ICONS.vendors}
          label="Total vendors"
          value={String(data.totalVendors)}
          hint={data.totalVendors > 0 ? "Workspaces on the platform" : "No vendors onboarded yet"}
        />
        <KpiCard
          tone="success"
          icon={ICONS.active}
          label="Active vendors"
          value={String(data.activeVendors)}
          hint={activeVendorHint}
        />
        <KpiCard
          tone="warning"
          icon={ICONS.trial}
          label="Trial vendors"
          value={String(derived.trialCount)}
          hint={trialHint}
        />
        <KpiCard
          tone="violet"
          icon={ICONS.paid}
          label="Paid subscriptions"
          value={String(derived.paidCount)}
          hint={paidHint}
        />
      </section>

      <section className="admin-dashboard-highlight" aria-label="Total payments">
        <div className="admin-dashboard-highlight-card">
          <div className="admin-dashboard-highlight-icon" aria-hidden="true">
            {ICONS.payments}
          </div>
          <div className="admin-dashboard-highlight-body">
            <span className="admin-dashboard-highlight-label">Total payments</span>
            <strong className="admin-dashboard-highlight-value">
              {paymentsValuePrefix}{formatMoney(derived.totalPaymentsAmount)}
            </strong>
            <small className="admin-dashboard-highlight-hint">{paymentsHintBase}</small>
          </div>
          {typeof navigate === "function" ? (
            <button
              className="secondary-button compact admin-dashboard-highlight-action"
              onClick={() => navigate("/admin/billing")}
              type="button"
            >
              View payments →
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel-block dashboard-wide-panel admin-dashboard-activity-panel">
        <SectionHeader
          hint="Latest vendors and payments across the platform"
          title="Recent activity"
        />
        <div className="admin-dashboard-activity-stack">
          <div className="admin-dashboard-activity-block">
            <div className="admin-dashboard-activity-block-head">
              <span className="admin-dashboard-activity-icon" aria-hidden="true">
                {ICONS.vendors}
              </span>
              <h3>Recent vendors</h3>
              {typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/admin/vendors")}
                  type="button"
                >
                  All vendors
                </button>
              ) : null}
            </div>
            <RecentSignups
              formatDate={formatDate}
              items={(data.vendors || []).slice(0, 5)}
              navigate={navigate}
            />
          </div>

          <div className="admin-dashboard-activity-block">
            <div className="admin-dashboard-activity-block-head">
              <span className="admin-dashboard-activity-icon" aria-hidden="true">
                {ICONS.payments}
              </span>
              <h3>Recent payments</h3>
              {typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/admin/billing")}
                  type="button"
                >
                  Open billing
                </button>
              ) : null}
            </div>
            <RecentPayments
              formatDate={formatDate}
              formatMoney={formatMoney}
              items={(data.payments || []).slice(0, 5)}
              navigate={navigate}
            />
          </div>
        </div>
      </section>

      <section className="panel-block admin-dashboard-vendors-panel">
        <SectionHeader
          action={
            typeof navigate === "function" ? (
              <button
                className="link-button"
                onClick={() => navigate("/admin/vendors")}
                type="button"
              >
                Manage vendors
              </button>
            ) : null
          }
          hint={
            data.totalVendors > derived.vendorRows.length
              ? `Showing ${derived.vendorRows.length} of ${data.totalVendors}`
              : `${derived.vendorRows.length} vendor${derived.vendorRows.length === 1 ? "" : "s"}`
          }
          title="Vendors"
        />
        <VendorTable
          formatDate={formatDate}
          navigate={navigate}
          rows={derived.vendorRows}
          totalVendors={data.totalVendors}
        />
      </section>
    </div>
  );
}

export default AdminDashboardScreen;
