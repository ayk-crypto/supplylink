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
  mrr: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 3v14" />
      <path d="M13.5 6.5c-.7-1-2.1-1.5-3.5-1.5s-3 .7-3 2.2c0 1.5 1.5 2 3.3 2.4 1.7.4 3.2 1 3.2 2.5 0 1.5-1.6 2.4-3.5 2.4-1.5 0-3-.6-3.5-1.7" />
    </svg>
  ),
  revenue: (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 16V8m4 8V5m4 11v-9m4 9v-6" />
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

function getPlanByCode(plans, code) {
  if (!code || !Array.isArray(plans)) return null;
  return plans.find((p) => p.code === code) || null;
}

function monthlyEquivalentForSub(sub, plans) {
  const planCode = getSubscriptionPlan(sub);
  if (!planCode || planCode === "free" || planCode === "custom") return 0;
  const plan = getPlanByCode(plans, planCode);
  if (!plan) return 0;
  if (sub.billingCycle === "annual") {
    const annual = Number(plan.annualPrice) || 0;
    return annual > 0 ? annual / 12 : 0;
  }
  return Number(plan.monthlyPrice) || 0;
}

function isInCurrentMonth(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
}

function KpiCard({ tone, label, value, hint, meta, icon }) {
  return (
    <article className="kpi-card" data-tone={tone || "neutral"}>
      <div className="kpi-card-head">
        <span className="kpi-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="kpi-card-label">{label}</span>
      </div>
      <strong className="kpi-card-value">{value}</strong>
      {meta ? <div className="kpi-card-meta">{meta}</div> : null}
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
        onClick={() => navigate("/admin/vendors")}
        type="button"
      >
        Manage Vendors
      </button>
      <button
        className="primary-button compact"
        onClick={() => navigate("/admin/billing")}
        type="button"
      >
        Open Admin Billing
      </button>
    </div>
  );
}

function QuickActions({ navigate }) {
  if (typeof navigate !== "function") return null;
  return (
    <div className="admin-dashboard-quick-actions">
      <button
        className="admin-dashboard-quick-action"
        data-tone="primary"
        onClick={() => navigate("/admin/vendors")}
        type="button"
      >
        <span className="admin-dashboard-quick-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="8" r="3" />
            <path d="M3 17c0-2.8 2.7-5 6-5s6 2.2 6 5" />
            <path d="M15 5v4M13 7h4" />
          </svg>
        </span>
        <span className="admin-dashboard-quick-body">
          <strong>Create Vendor</strong>
          <small>Onboard a new client workspace</small>
        </span>
      </button>
      <button
        className="admin-dashboard-quick-action"
        data-tone="neutral"
        onClick={() => navigate("/admin/billing")}
        type="button"
      >
        <span className="admin-dashboard-quick-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="14" height="11" rx="2" />
            <path d="M3 9h14" />
            <path d="M7 13h3" />
          </svg>
        </span>
        <span className="admin-dashboard-quick-body">
          <strong>Admin Billing</strong>
          <small>Plans, subscriptions, manual payments</small>
        </span>
      </button>
      <button
        className="admin-dashboard-quick-action"
        data-tone="neutral"
        onClick={() => navigate("/admin/vendors")}
        type="button"
      >
        <span className="admin-dashboard-quick-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 17V8.5l6.5-4 6.5 4V17" />
            <path d="M3.5 17h13" />
          </svg>
        </span>
        <span className="admin-dashboard-quick-body">
          <strong>All Vendors</strong>
          <small>Search, filter, and review tenants</small>
        </span>
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
        New vendor workspaces will appear here as soon as you onboard one.
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
                {vendor.createdAt ? (
                  <span>Joined {formatDate(vendor.createdAt)}</span>
                ) : (
                  <span>Joined date unavailable</span>
                )}
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
              {typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/admin/vendors")}
                  type="button"
                >
                  View
                </button>
              ) : null}
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
              <div>
                <strong>{payment.vendor?.displayName || "Vendor"}</strong>
                <p>{payment.vendor?.slug || "—"}</p>
                <span>
                  {planLabel(planCode)} · {billingCycleLabel(payment.billingCycle)}
                </span>
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
              <span>{formatDate(payment.paidAt || payment.createdAt)}</span>
            </div>
          </article>
        );
      })}
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
    recentVendors: [],
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
        listAdminVendors({ page: 1, pageSize: 5 }),
        listAdminVendors({ page: 1, pageSize: 1, status: "active" }),
        listAdminSubscriptions({ page: 1, pageSize: SUBS_PAGE_SIZE }),
        listBillingPayments({ page: 1, pageSize: PAYMENTS_PAGE_SIZE }),
        listBillingPlans()
      ]);

      const recentVendors = vendorsResp?.data?.items || [];
      const totalVendors = vendorsResp?.data?.pagination?.totalItems ?? recentVendors.length;
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
        recentVendors,
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
    let mrr = 0;

    subs.forEach((sub) => {
      const status = getSubscriptionStatus(sub);
      if (status === "trial") trialCount += 1;
      if (status === "active" || status === "past_due") paidCount += 1;
      if (status === "active") {
        mrr += monthlyEquivalentForSub(sub, data.plans);
      }
    });

    const payments = data.payments || [];
    const monthlyManualRevenue = payments
      .filter(
        (p) => p.paymentStatus === "received" && isInCurrentMonth(p.paidAt || p.createdAt)
      )
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const subsTruncated = data.subsTotal > subs.length;
    const paymentsTruncated = data.paymentsTotal > payments.length;

    return {
      trialCount,
      paidCount,
      mrr,
      monthlyManualRevenue,
      subsTruncated,
      paymentsTruncated
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="dashboard-page dashboard-v2 admin-dashboard-page">
        <PageHeader eyebrow="Platform" title="Loading platform dashboard" />
        <section className="dashboard-kpi-grid">
          {Array.from({ length: 6 }).map((_, index) => (
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

  const trialHint = derived.subsTruncated
    ? `From first ${data.subscriptions.length} of ${data.subsTotal} subscriptions`
    : data.subsTotal === 0
      ? "No subscriptions yet"
      : "Across all tenants";

  const paidHint = derived.subsTruncated
    ? `Active or past-due in the first ${data.subscriptions.length}`
    : "Active or past-due subscriptions";

  const mrrPrefix = derived.subsTruncated ? "≈ " : "";
  const mrrHint = derived.mrr > 0
    ? `${derived.paidCount} active subscription${derived.paidCount === 1 ? "" : "s"}`
    : data.plans.length === 0
      ? "Plan pricing unavailable"
      : "No paid subscriptions yet";

  const monthlyRevenueHint = derived.paymentsTruncated
    ? `From the first ${data.payments.length} of ${data.paymentsTotal} payments`
    : "Received payments this calendar month";

  const activeVendorPercent = data.totalVendors > 0
    ? Math.round((data.activeVendors / data.totalVendors) * 100)
    : 0;

  return (
    <div className="dashboard-page dashboard-v2 admin-dashboard-page">
      <PageHeader
        eyebrow="Platform"
        title="Platform Dashboard"
        description="Tenant health, subscription mix, and recent revenue across all SupplyLink workspaces."
        action={<HeaderActions navigate={navigate} />}
      />

      <section className="dashboard-kpi-grid" aria-label="Platform metrics">
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
          hint={
            data.totalVendors > 0
              ? `${activeVendorPercent}% of all vendors`
              : "Onboard a vendor to begin"
          }
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
        <KpiCard
          tone="success"
          icon={ICONS.mrr}
          label="Monthly recurring revenue"
          value={`${mrrPrefix}${formatMoney(derived.mrr)}`}
          hint={mrrHint}
        />
        <KpiCard
          tone="info"
          icon={ICONS.revenue}
          label="Manual revenue (this month)"
          value={formatMoney(derived.monthlyManualRevenue)}
          hint={monthlyRevenueHint}
        />
      </section>

      <section className="panel-block admin-dashboard-quick-panel">
        <SectionHeader hint="Jump straight into the workflow" title="Quick actions" />
        <QuickActions navigate={navigate} />
      </section>

      <section className="dashboard-insights-grid">
        <div className="panel-block dashboard-wide-panel">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/admin/vendors")}
                  type="button"
                >
                  All vendors
                </button>
              ) : null
            }
            hint={`Latest ${Math.min(data.recentVendors.length, 5)} of ${data.totalVendors}`}
            title="Recent vendor signups"
          />
          <RecentSignups
            formatDate={formatDate}
            items={data.recentVendors.slice(0, 5)}
            navigate={navigate}
          />
        </div>

        <div className="panel-block dashboard-wide-panel">
          <SectionHeader
            action={
              typeof navigate === "function" ? (
                <button
                  className="link-button"
                  onClick={() => navigate("/admin/billing")}
                  type="button"
                >
                  Open billing
                </button>
              ) : null
            }
            hint={
              data.paymentsTotal === 0
                ? "No payments yet"
                : `Showing ${Math.min(data.payments.length, 5)} most recent`
            }
            title="Recent payments"
          />
          <RecentPayments
            formatDate={formatDate}
            formatMoney={formatMoney}
            items={(data.payments || []).slice(0, 5)}
            navigate={navigate}
          />
        </div>
      </section>
    </div>
  );
}

export default AdminDashboardScreen;
