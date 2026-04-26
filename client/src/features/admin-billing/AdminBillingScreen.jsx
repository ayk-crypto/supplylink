import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingState,
  PageHeader,
  Pagination,
  SectionHeader,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import {
  createBillingPayment,
  listAdminSubscriptions,
  listBillingPayments,
  listBillingPlans,
  updateAdminSubscription,
  updateBillingPlan
} from "../../services/adminBillingApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";

const PLAN_ORDER = ["free", "basic", "pro", "custom"];
const FALLBACK_PLAN_OPTIONS = PLAN_ORDER;
const PLAN_TONES = {
  free: "neutral",
  basic: "info",
  pro: "violet",
  custom: "success"
};
const STATUS_OPTIONS = ["trial", "active", "expired", "cancelled"];
const SUBSCRIPTION_STATUS_TONES = {
  trial: "info",
  active: "success",
  expired: "warning",
  cancelled: "danger"
};
const PAYMENT_STATUS_TONES = {
  received: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral"
};
const BILLING_CYCLE_OPTIONS = ["monthly", "annual"];
const PAYMENT_METHOD_OPTIONS = [
  "bank_transfer",
  "cash",
  "card_manual",
  "easypaisa",
  "jazzcash",
  "other"
];
const PAYMENT_STATUS_OPTIONS = ["received", "pending", "failed", "refunded"];

function formatLimit(value) {
  return value === null || value === undefined ? "Unlimited" : String(value);
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function formatToken(value) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDatetimeInputValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeInputValue(value) {
  return value ? new Date(value).toISOString() : null;
}

function toNullableNumber(value) {
  if (value === "") {
    return null;
  }

  return Number(value);
}

function buildSubscriptionDraft(subscription) {
  return {
    plan: subscription.currentPlan || subscription.basePlan || "free",
    status: subscription.subscriptionStatus || subscription.status || "trial",
    billingCycle: subscription.billingCycle || "monthly",
    currentPeriodEnd: toDatetimeInputValue(subscription.currentPeriodEnd),
    trialEndsAt: toDatetimeInputValue(subscription.trialEndsAt),
    extendTrialDays: "",
    adminNotes: subscription.adminNotes || ""
  };
}

function buildPlanDraft(plan) {
  return {
    displayName: plan.displayName || "",
    monthlyPrice: String(plan.monthlyPrice ?? 0),
    annualPrice: String(plan.annualPrice ?? 0),
    annualFreeMonths: String(plan.annualFreeMonths ?? 3),
    maxCustomers: plan.maxCustomers ?? "",
    maxInvoicesPerMonth: plan.maxInvoicesPerMonth ?? "",
    isActive: Boolean(plan.isActive)
  };
}

function formatPlanAmount(value) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "0";
  }

  return String(amount);
}

function getPlanBillingAmount(plans, planCode, billingCycle) {
  if (planCode === "free") {
    return "0";
  }

  const plan = plans.find((item) => item.code === planCode);
  const amount = billingCycle === "annual" ? plan?.annualPrice : plan?.monthlyPrice;

  return formatPlanAmount(amount);
}

function getPlanOptions(plans) {
  if (!plans.length) {
    return FALLBACK_PLAN_OPTIONS;
  }
  const codes = plans.map((plan) => plan.code);
  return [...codes].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a);
    const bi = PLAN_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function getPlanLabel(plans, planCode) {
  const plan = plans.find((item) => item.code === planCode);
  return plan?.displayName || formatToken(planCode);
}

function getPlanTone(planCode) {
  return PLAN_TONES[planCode] || "neutral";
}

function sortPlans(plans) {
  return [...plans].sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.code);
    const bi = PLAN_ORDER.indexOf(b.code);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function buildPaymentDraft(amount = "0") {
  return {
    vendorId: "",
    planCode: "basic",
    billingCycle: "monthly",
    amount,
    currency: "PKR",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    paymentStatus: "received",
    paidAt: toDatetimeInputValue(new Date().toISOString()),
    notes: ""
  };
}

function PlanBadge({ plans, planCode }) {
  if (!planCode) return <span className="ab-plan-badge" data-tone="neutral">—</span>;
  return (
    <span className="ab-plan-badge" data-tone={getPlanTone(planCode)}>
      {getPlanLabel(plans, planCode)}
    </span>
  );
}

function PlanCard({ plan, onEdit }) {
  const tone = getPlanTone(plan.code);
  return (
    <article className="ab-plan-card" data-tone={tone}>
      <header className="ab-plan-card-head">
        <span className="ab-plan-badge" data-tone={tone}>
          {plan.displayName || formatToken(plan.code)}
        </span>
        <span
          className={`ab-plan-status ${plan.isActive ? "is-active" : "is-inactive"}`}
        >
          {plan.isActive ? "Active" : "Inactive"}
        </span>
      </header>

      <div className="ab-plan-prices">
        <div className="ab-plan-price">
          <span className="ab-plan-price-amount">{toMoney(plan.monthlyPrice)}</span>
          <span className="ab-plan-price-cycle">/ month</span>
        </div>
        <div className="ab-plan-price ab-plan-price-secondary">
          <span className="ab-plan-price-amount">{toMoney(plan.annualPrice)}</span>
          <span className="ab-plan-price-cycle">/ year</span>
        </div>
      </div>

      <ul className="ab-plan-limits">
        <li>
          <span className="ab-plan-limit-label">Customers</span>
          <strong>{formatLimit(plan.maxCustomers)}</strong>
        </li>
        <li>
          <span className="ab-plan-limit-label">Invoices / month</span>
          <strong>{formatLimit(plan.maxInvoicesPerMonth)}</strong>
        </li>
      </ul>

      <p className="ab-plan-note">
        {plan.annualBenefit?.label ||
          `Annual billing includes ${plan.annualFreeMonths ?? 3} free months`}
      </p>

      <button className="secondary-button compact" onClick={() => onEdit(plan)} type="button">
        Edit plan
      </button>
    </article>
  );
}

function AdminBillingScreen() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [paymentPagination, setPaymentPagination] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    plan: "",
    billingCycle: ""
  });
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [subscriptionDraft, setSubscriptionDraft] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planDraft, setPlanDraft] = useState(null);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState(buildPaymentDraft);
  const planOptions = useMemo(() => getPlanOptions(plans), [plans]);
  const orderedPlans = useMemo(() => sortPlans(plans), [plans]);

  const query = useMemo(
    () => ({
      ...filters,
      page,
      pageSize: 50
    }),
    [filters, page]
  );
  const paymentQuery = useMemo(
    () => ({
      page: paymentPage,
      pageSize: 50
    }),
    [paymentPage]
  );

  const loadBilling = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [plansResponse, subscriptionsResponse, paymentsResponse] = await Promise.all([
        listBillingPlans(),
        listAdminSubscriptions(query),
        listBillingPayments(paymentQuery)
      ]);
      setPlans(plansResponse.data || []);
      setSubscriptions(subscriptionsResponse.data?.items || []);
      setPagination(subscriptionsResponse.data?.pagination || null);
      setPayments(paymentsResponse.data?.items || []);
      setPaymentPagination(paymentsResponse.data?.pagination || null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Billing controls could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, [paymentQuery, query]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  function submitFilters(event) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      search: searchDraft.trim()
    }));
    setPage(1);
  }

  function openSubscriptionEditor(subscription) {
    setEditingSubscription(subscription);
    setSubscriptionDraft(buildSubscriptionDraft(subscription));
  }

  function openPlanEditor(plan) {
    setEditingPlan(plan);
    setPlanDraft(buildPlanDraft(plan));
  }

  function getDefaultPaymentAmount(planCode, billingCycle) {
    return getPlanBillingAmount(plans, planCode, billingCycle);
  }

  function openPaymentForm() {
    setPaymentDraft(buildPaymentDraft(getDefaultPaymentAmount("basic", "monthly")));
    setIsPaymentFormOpen(true);
  }

  function updatePaymentPlan(planCode) {
    setPaymentDraft((current) => ({
      ...current,
      planCode,
      amount: getDefaultPaymentAmount(planCode, current.billingCycle)
    }));
  }

  function updatePaymentBillingCycle(billingCycle) {
    setPaymentDraft((current) => ({
      ...current,
      billingCycle,
      amount: getDefaultPaymentAmount(current.planCode, billingCycle)
    }));
  }

  async function saveSubscription(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateAdminSubscription(editingSubscription.vendor.id, {
        plan: subscriptionDraft.plan,
        status: subscriptionDraft.status,
        billingCycle: subscriptionDraft.billingCycle,
        currentPeriodEnd: fromDatetimeInputValue(subscriptionDraft.currentPeriodEnd),
        trialEndsAt: fromDatetimeInputValue(subscriptionDraft.trialEndsAt),
        extendTrialDays: subscriptionDraft.extendTrialDays
          ? Number(subscriptionDraft.extendTrialDays)
          : undefined,
        adminNotes: subscriptionDraft.adminNotes.trim() || null
      });
      showToast({
        title: "Subscription updated",
        message: "The vendor billing settings were saved.",
        tone: "success"
      });
      setEditingSubscription(null);
      setSubscriptionDraft(null);
      loadBilling();
    } catch (requestError) {
      showToast({
        title: "Save failed",
        message: getApiErrorMessage(requestError, "The subscription could not be saved."),
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function savePlan(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateBillingPlan(editingPlan.code, {
        displayName: planDraft.displayName.trim(),
        monthlyPrice: Number(planDraft.monthlyPrice),
        annualPrice: Number(planDraft.annualPrice),
        annualFreeMonths: Number(planDraft.annualFreeMonths),
        maxCustomers: toNullableNumber(planDraft.maxCustomers),
        maxInvoicesPerMonth: toNullableNumber(planDraft.maxInvoicesPerMonth),
        isActive: planDraft.isActive
      });
      showToast({
        title: "Plan updated",
        message: "The plan configuration is now live.",
        tone: "success"
      });
      setEditingPlan(null);
      setPlanDraft(null);
      loadBilling();
    } catch (requestError) {
      showToast({
        title: "Save failed",
        message: getApiErrorMessage(requestError, "The plan could not be saved."),
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function savePayment(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await createBillingPayment({
        vendorId: paymentDraft.vendorId,
        planCode: paymentDraft.planCode,
        billingCycle: paymentDraft.billingCycle,
        amount: Number(paymentDraft.amount || 0),
        currency: paymentDraft.currency.trim() || "PKR",
        paymentMethod: paymentDraft.paymentMethod,
        paymentReference: paymentDraft.paymentReference.trim() || null,
        paymentStatus: paymentDraft.paymentStatus,
        paidAt: fromDatetimeInputValue(paymentDraft.paidAt),
        notes: paymentDraft.notes.trim() || null
      });
      showToast({
        title: "Payment recorded",
        message:
          paymentDraft.paymentStatus === "received"
            ? "The payment was recorded and the subscription was activated."
            : "The payment history entry was recorded.",
        tone: "success"
      });
      setIsPaymentFormOpen(false);
      setPaymentDraft(buildPaymentDraft(getDefaultPaymentAmount("basic", "monthly")));
      loadBilling();
    } catch (requestError) {
      showToast({
        title: "Payment failed",
        message: getApiErrorMessage(requestError, "The manual payment could not be recorded."),
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  const selectedPaymentPlan = plans.find((plan) => plan.code === paymentDraft.planCode);
  const annualFreeMonths = selectedPaymentPlan?.annualFreeMonths ?? 3;
  const annualHelperText =
    selectedPaymentPlan?.annualBenefit?.label ||
    `Annual billing includes ${annualFreeMonths} free months.`;

  return (
    <div className="resource-page admin-billing-page">
      <PageHeader
        description="Manage plan limits, billing cycles, periods, and vendor subscription state without payment gateway integration."
        eyebrow="Admin"
        title="Billing Control Panel"
        action={
          <div className="button-row">
            <button className="primary-button compact" onClick={openPaymentForm} type="button">
              Record payment
            </button>
          </div>
        }
      />

      {error ? <ErrorState message={error} onRetry={loadBilling} /> : null}
      {isLoading ? <LoadingState>Loading billing controls...</LoadingState> : null}

      {!isLoading ? (
        <>
          <section className="ab-panel">
            <SectionHeader
              title="Plan configuration"
              hint="Pricing, limits, and trial benefits applied across all vendor workspaces."
            />
            <div className="ab-plan-grid">
              {orderedPlans.map((plan) => (
                <PlanCard key={plan.code} onEdit={openPlanEditor} plan={plan} />
              ))}
            </div>
          </section>

          <section className="ab-panel">
            <SectionHeader
              title="Vendor subscriptions"
              hint="Search by vendor name, slug, or email."
            />
            <Toolbar onSubmit={submitFilters}>
              <input
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search vendors"
                type="search"
                value={searchDraft}
              />
              <select
                onChange={(event) => {
                  setFilters((current) => ({ ...current, plan: event.target.value }));
                  setPage(1);
                }}
                value={filters.plan}
              >
                <option value="">All plans</option>
                {planOptions.map((plan) => (
                  <option key={plan} value={plan}>
                    {getPlanLabel(plans, plan)}
                  </option>
                ))}
              </select>
              <select
                onChange={(event) => {
                  setFilters((current) => ({ ...current, status: event.target.value }));
                  setPage(1);
                }}
                value={filters.status}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatToken(status)}
                  </option>
                ))}
              </select>
              <select
                onChange={(event) => {
                  setFilters((current) => ({ ...current, billingCycle: event.target.value }));
                  setPage(1);
                }}
                value={filters.billingCycle}
              >
                <option value="">All cycles</option>
                {BILLING_CYCLE_OPTIONS.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {formatToken(cycle)}
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="submit">
                Search
              </button>
            </Toolbar>

            {!subscriptions.length ? (
              <EmptyState title="No matching subscriptions">
                Try clearing the filters to see all vendor subscriptions.
              </EmptyState>
            ) : null}
            {subscriptions.length ? (
              <>
                <TableScroll>
                  <div className="resource-table">
                    <div className="resource-table-head ab-subscriptions-grid">
                      <span>Vendor</span>
                      <span>Plan</span>
                      <span>Status</span>
                      <span>Cycle</span>
                      <span>Period end</span>
                      <span>Usage</span>
                      <span className="actions-col">Actions</span>
                    </div>
                    {subscriptions.map((subscription) => (
                      <article
                        className="resource-row ab-subscriptions-grid"
                        key={subscription.vendor.id}
                      >
                        <div className="ab-cell-vendor">
                          <strong>{subscription.vendor.displayName}</strong>
                          <small>{subscription.vendor.slug}</small>
                        </div>
                        <div className="ab-cell-plan">
                          <PlanBadge plans={plans} planCode={subscription.currentPlan} />
                          {subscription.effectiveAccess &&
                          subscription.effectiveAccess !== subscription.currentPlan ? (
                            <small>
                              Access: {getPlanLabel(plans, subscription.effectiveAccess)}
                            </small>
                          ) : null}
                        </div>
                        <div>
                          <StatusPill
                            status={subscription.status}
                            tone={SUBSCRIPTION_STATUS_TONES[subscription.status]}
                            label={formatToken(subscription.status)}
                          />
                        </div>
                        <span className="ab-cell-text">
                          {formatToken(subscription.billingCycle)}
                        </span>
                        <span className="ab-cell-text">
                          {formatDate(subscription.currentPeriodEnd)}
                        </span>
                        <span className="ab-cell-text">
                          {subscription.usage.customers}/
                          {formatLimit(subscription.limits.maxCustomers)} customers
                        </span>
                        <div className="row-actions">
                          <button
                            className="primary-button compact"
                            onClick={() => openSubscriptionEditor(subscription)}
                            type="button"
                          >
                            Update
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </TableScroll>
                <Pagination pagination={pagination} onPageChange={setPage} />
              </>
            ) : null}
          </section>

          <section className="ab-panel">
            <SectionHeader
              action={
                <button
                  className="primary-button compact"
                  onClick={openPaymentForm}
                  type="button"
                >
                  Record payment
                </button>
              }
              title="Billing history"
              hint="Manual subscription payments recorded by platform admins."
            />
            {!payments.length ? (
              <EmptyState
                title="No billing payments yet"
                action={
                  <button
                    className="primary-button compact"
                    onClick={openPaymentForm}
                    type="button"
                  >
                    Record first payment
                  </button>
                }
              >
                Once you record a manual subscription payment, it will appear here with vendor,
                plan, method, status, and billing period details.
              </EmptyState>
            ) : null}
            {payments.length ? (
              <>
                <TableScroll>
                  <div className="resource-table">
                    <div className="resource-table-head ab-payments-grid">
                      <span>Vendor</span>
                      <span>Plan</span>
                      <span>Amount</span>
                      <span>Method</span>
                      <span>Status</span>
                      <span>Period</span>
                      <span>Recorded</span>
                    </div>
                    {payments.map((payment) => (
                      <article
                        className="resource-row ab-payments-grid"
                        key={payment.id}
                      >
                        <div className="ab-cell-vendor">
                          <strong>{payment.vendor?.displayName || "Vendor"}</strong>
                          <small>{payment.vendor?.slug}</small>
                        </div>
                        <div className="ab-cell-plan">
                          <PlanBadge plans={plans} planCode={payment.planCode} />
                          <small>{formatToken(payment.billingCycle)}</small>
                        </div>
                        <div className="ab-cell-amount">
                          <strong>
                            {payment.currency} {Number(payment.amount).toLocaleString()}
                          </strong>
                        </div>
                        <span className="ab-cell-text">
                          {formatToken(payment.paymentMethod)}
                        </span>
                        <div>
                          <StatusPill
                            status={payment.paymentStatus}
                            tone={PAYMENT_STATUS_TONES[payment.paymentStatus]}
                            label={formatToken(payment.paymentStatus)}
                          />
                        </div>
                        <span className="ab-cell-text">
                          {formatDate(payment.periodStart)} – {formatDate(payment.periodEnd)}
                        </span>
                        <div className="ab-cell-recorded">
                          <strong>{payment.recordedBy?.display || "System"}</strong>
                          <small>{formatDateTime(payment.createdAt)}</small>
                        </div>
                      </article>
                    ))}
                  </div>
                </TableScroll>
                <Pagination pagination={paymentPagination} onPageChange={setPaymentPage} />
              </>
            ) : null}
          </section>
        </>
      ) : null}

      {editingSubscription && subscriptionDraft ? (
        <FormPanel
          isSubmitting={isSaving}
          onCancel={() => setEditingSubscription(null)}
          onSubmit={saveSubscription}
          submitLabel="Save subscription"
          title={`Edit ${editingSubscription.vendor.displayName}`}
        >
          <Field label="Plan">
            <select
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, plan: event.target.value }))
              }
              value={subscriptionDraft.plan}
            >
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {getPlanLabel(plans, plan)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, status: event.target.value }))
              }
              value={subscriptionDraft.status}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatToken(status)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Billing cycle">
            <select
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, billingCycle: event.target.value }))
              }
              value={subscriptionDraft.billingCycle}
            >
              {BILLING_CYCLE_OPTIONS.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {formatToken(cycle)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Current period end">
            <input
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, currentPeriodEnd: event.target.value }))
              }
              type="datetime-local"
              value={subscriptionDraft.currentPeriodEnd}
            />
          </Field>
          <Field label="Trial ends">
            <input
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, trialEndsAt: event.target.value }))
              }
              type="datetime-local"
              value={subscriptionDraft.trialEndsAt}
            />
          </Field>
          <Field label="Extend trial by days" hint="Leave blank unless you want to extend the trial now.">
            <input
              min="1"
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, extendTrialDays: event.target.value }))
              }
              type="number"
              value={subscriptionDraft.extendTrialDays}
            />
          </Field>
          <Field label="Admin notes">
            <textarea
              onChange={(event) =>
                setSubscriptionDraft((current) => ({ ...current, adminNotes: event.target.value }))
              }
              rows="4"
              value={subscriptionDraft.adminNotes}
            />
          </Field>
        </FormPanel>
      ) : null}

      {editingPlan && planDraft ? (
        <FormPanel
          isSubmitting={isSaving}
          onCancel={() => setEditingPlan(null)}
          onSubmit={savePlan}
          submitLabel="Save plan"
          title={`Edit ${editingPlan.displayName}`}
        >
          <Field label="Display name">
            <input
              onChange={(event) => setPlanDraft((current) => ({ ...current, displayName: event.target.value }))}
              required
              value={planDraft.displayName}
            />
          </Field>
          <Field label="Monthly price">
            <input
              min="0"
              onChange={(event) => setPlanDraft((current) => ({ ...current, monthlyPrice: event.target.value }))}
              step="0.01"
              type="number"
              value={planDraft.monthlyPrice}
            />
          </Field>
          <Field label="Annual price">
            <input
              min="0"
              onChange={(event) => setPlanDraft((current) => ({ ...current, annualPrice: event.target.value }))}
              step="0.01"
              type="number"
              value={planDraft.annualPrice}
            />
          </Field>
          <Field label="Annual free months">
            <input
              min="0"
              onChange={(event) => setPlanDraft((current) => ({ ...current, annualFreeMonths: event.target.value }))}
              type="number"
              value={planDraft.annualFreeMonths}
            />
          </Field>
          <Field label="Max customers" hint="Blank means unlimited.">
            <input
              min="0"
              onChange={(event) => setPlanDraft((current) => ({ ...current, maxCustomers: event.target.value }))}
              type="number"
              value={planDraft.maxCustomers}
            />
          </Field>
          <Field label="Max invoices per month" hint="Blank means unlimited.">
            <input
              min="0"
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, maxInvoicesPerMonth: event.target.value }))
              }
              type="number"
              value={planDraft.maxInvoicesPerMonth}
            />
          </Field>
          <Field label="Active plan">
            <select
              onChange={(event) =>
                setPlanDraft((current) => ({ ...current, isActive: event.target.value === "true" }))
              }
              value={String(planDraft.isActive)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
        </FormPanel>
      ) : null}

      {isPaymentFormOpen ? (
        <FormPanel
          isSubmitting={isSaving}
          onCancel={() => setIsPaymentFormOpen(false)}
          onSubmit={savePayment}
          submitLabel="Record payment"
          title="Record manual payment"
        >
          <div className="ab-payment-form">
          <div className="ab-form-section" data-section="vendor">
            <h4 className="ab-form-section-title">Vendor &amp; plan</h4>
            <Field label="Vendor">
              <select
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, vendorId: event.target.value }))
                }
                required
                value={paymentDraft.vendorId}
              >
                <option value="">Select vendor</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.vendor.id} value={subscription.vendor.id}>
                    {subscription.vendor.displayName} ({subscription.vendor.slug})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan">
              <select
                onChange={(event) => updatePaymentPlan(event.target.value)}
                value={paymentDraft.planCode}
              >
                {planOptions.map((plan) => (
                  <option key={plan} value={plan}>
                    {getPlanLabel(plans, plan)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Billing cycle">
              <select
                onChange={(event) => updatePaymentBillingCycle(event.target.value)}
                value={paymentDraft.billingCycle}
              >
                {BILLING_CYCLE_OPTIONS.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {formatToken(cycle)}
                  </option>
                ))}
              </select>
            </Field>
            {paymentDraft.billingCycle === "annual" ? (
              <p className="ab-form-helper" data-tone="info">
                <strong>Annual benefit:</strong> {annualHelperText}
              </p>
            ) : null}
          </div>

          <div className="ab-form-section" data-section="amount">
            <h4 className="ab-form-section-title">Amount</h4>
            <p className="ab-form-helper" data-tone="muted">
              Auto-filled from the selected plan. Adjust for discounts or custom billing.
            </p>
            <div className="ab-amount-row">
              <Field label="Amount">
                <input
                  className="ab-amount-input"
                  min="0"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({ ...current, amount: event.target.value }))
                  }
                  required
                  step="0.01"
                  type="number"
                  value={paymentDraft.amount}
                />
              </Field>
              <Field label="Currency">
                <input
                  maxLength="10"
                  onChange={(event) =>
                    setPaymentDraft((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase()
                    }))
                  }
                  required
                  value={paymentDraft.currency}
                />
              </Field>
            </div>
          </div>

          <div className="ab-form-section" data-section="payment">
            <h4 className="ab-form-section-title">Payment details</h4>
            <Field label="Payment method">
              <select
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, paymentMethod: event.target.value }))
                }
                value={paymentDraft.paymentMethod}
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {formatToken(method)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, paymentStatus: event.target.value }))
                }
                value={paymentDraft.paymentStatus}
              >
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatToken(status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paid at">
              <input
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, paidAt: event.target.value }))
                }
                type="datetime-local"
                value={paymentDraft.paidAt}
              />
            </Field>
            <Field label="Reference" hint="Bank reference, transaction ID, or cheque number.">
              <input
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, paymentReference: event.target.value }))
                }
                value={paymentDraft.paymentReference}
              />
            </Field>
            <Field label="Notes">
              <textarea
                onChange={(event) =>
                  setPaymentDraft((current) => ({ ...current, notes: event.target.value }))
                }
                rows="3"
                value={paymentDraft.notes}
              />
            </Field>
          </div>
          </div>
        </FormPanel>
      ) : null}
    </div>
  );
}

export default AdminBillingScreen;
