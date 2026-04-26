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

const FALLBACK_PLAN_OPTIONS = ["free", "basic", "pro", "custom"];
const STATUS_OPTIONS = ["trial", "active", "expired", "cancelled"];
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
  return plans.length ? plans.map((plan) => plan.code) : FALLBACK_PLAN_OPTIONS;
}

function getPlanLabel(plans, planCode) {
  const plan = plans.find((item) => item.code === planCode);
  return plan?.displayName || formatToken(planCode);
}

function buildPaymentDraft(amount = "0") {
  return {
    vendorId: "",
    planCode: "basic",
    billingCycle: "monthly",
    amount,
    currency: "USD",
    paymentMethod: "bank_transfer",
    paymentReference: "",
    paymentStatus: "received",
    paidAt: toDatetimeInputValue(new Date().toISOString()),
    notes: ""
  };
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
        currency: paymentDraft.currency.trim() || "USD",
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

  return (
    <div className="resource-page">
      <PageHeader
        description="Manage plan limits, billing cycles, periods, and vendor subscription state without payment gateway integration."
        eyebrow="Admin"
        title="Billing Control Panel"
      />

      {error ? <ErrorState message={error} onRetry={loadBilling} /> : null}
      {isLoading ? <LoadingState>Loading billing controls...</LoadingState> : null}

      {!isLoading ? (
        <>
          <section className="transaction-panel">
            <SectionHeader title="Editable plans" hint="Null limits are treated as unlimited." />
            <div className="admin-plan-grid">
              {plans.map((plan) => (
                <article className="subscription-stat" key={plan.code}>
                  <span>{plan.code}</span>
                  <strong>{plan.displayName}</strong>
                  <small>
                    {toMoney(plan.monthlyPrice)} monthly / {toMoney(plan.annualPrice)} annual
                  </small>
                  <small>
                    Customers: {formatLimit(plan.maxCustomers)}; invoices/month:{" "}
                    {formatLimit(plan.maxInvoicesPerMonth)}
                  </small>
                  <small>{plan.isActive ? "Active" : "Inactive"}</small>
                  <small>{plan.annualBenefit?.label || `Annual includes ${plan.annualFreeMonths} free months`}</small>
                  <button className="secondary-button" onClick={() => openPlanEditor(plan)} type="button">
                    Edit plan
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="transaction-panel">
            <SectionHeader title="Vendor subscriptions" hint="Search by vendor name, slug, or email." />
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
                    {status}
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
                    {cycle}
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="submit">
                Search
              </button>
            </Toolbar>

            {!subscriptions.length ? <EmptyState>No vendor subscriptions match the current filters.</EmptyState> : null}
            {subscriptions.length ? (
              <>
                <TableScroll>
                  <div className="resource-table">
                    <div className="resource-table-head admin-billing-grid">
                      <span>Vendor</span>
                      <span>Plan</span>
                      <span>Status</span>
                      <span>Cycle</span>
                      <span>Period end</span>
                      <span>Usage</span>
                      <span className="actions-col">Actions</span>
                    </div>
                    {subscriptions.map((subscription) => (
                      <article className="resource-row admin-billing-grid" key={subscription.vendor.id}>
                        <div>
                          <strong>{subscription.vendor.displayName}</strong>
                          <small>{subscription.vendor.slug}</small>
                        </div>
                        <div>
                          <strong>{getPlanLabel(plans, subscription.currentPlan)}</strong>
                          <small>Access: {getPlanLabel(plans, subscription.effectiveAccess)}</small>
                        </div>
                        <StatusPill status={subscription.status} />
                        <span>{subscription.billingCycle}</span>
                        <span>{formatDate(subscription.currentPeriodEnd)}</span>
                        <span>
                          {subscription.usage.customers}/{formatLimit(subscription.limits.maxCustomers)} customers
                        </span>
                        <div className="row-actions">
                          <button
                            className="secondary-button"
                            onClick={() => openSubscriptionEditor(subscription)}
                            type="button"
                          >
                            Edit
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

          <section className="transaction-panel">
            <SectionHeader
              action={
                <button
                  className="primary-button"
                  onClick={openPaymentForm}
                  type="button"
                >
                  Record payment
                </button>
              }
              title="Billing history"
              hint="Manual subscription payments recorded by platform admins."
            />
            {!payments.length ? <EmptyState>No billing payments have been recorded yet.</EmptyState> : null}
            {payments.length ? (
              <>
                <TableScroll>
                  <div className="resource-table">
                    <div className="resource-table-head admin-payments-grid">
                      <span>Vendor</span>
                      <span>Plan</span>
                      <span>Amount</span>
                      <span>Method</span>
                      <span>Status</span>
                      <span>Period</span>
                      <span>Recorded by</span>
                    </div>
                    {payments.map((payment) => (
                      <article className="resource-row admin-payments-grid" key={payment.id}>
                        <div>
                          <strong>{payment.vendor?.displayName || "Vendor"}</strong>
                          <small>{payment.vendor?.slug}</small>
                        </div>
                        <div>
                          <strong>{payment.planCode}</strong>
                          <small>{payment.billingCycle}</small>
                        </div>
                        <span>
                          {payment.currency} {Number(payment.amount).toLocaleString()}
                        </span>
                        <span>{formatToken(payment.paymentMethod)}</span>
                        <StatusPill status={payment.paymentStatus} />
                        <span>
                          {formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)}
                        </span>
                        <div>
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
                  {status}
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
                  {cycle}
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
                  {cycle}
                </option>
              ))}
            </select>
            {paymentDraft.billingCycle === "annual" ? (
              <small>
                {plans.find((plan) => plan.code === paymentDraft.planCode)?.annualBenefit?.label ||
                  "Annual billing follows the selected plan configuration."}
              </small>
            ) : null}
          </Field>
          <Field
            hint="Auto-filled from the selected plan. You can adjust it for discounts or custom billing."
            label="Amount"
          >
            <input
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
                setPaymentDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
              }
              required
              value={paymentDraft.currency}
            />
          </Field>
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
          <Field label="Reference">
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
              rows="4"
              value={paymentDraft.notes}
            />
          </Field>
        </FormPanel>
      ) : null}
    </div>
  );
}

export default AdminBillingScreen;
