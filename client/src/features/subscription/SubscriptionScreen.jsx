import { useEffect, useState } from "react";
import {
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import { useAuth } from "../auth/useAuth.js";
import { useToast } from "../feedback/toastContext.js";
import {
  cancelSubscription,
  getSubscription,
  upgradeSubscription
} from "../../services/subscriptionApi.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";

function formatLimit(value) {
  return value === null || value === undefined ? "Unlimited" : String(value);
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleDateString();
}

function formatStatus(subscription) {
  if (subscription.status === "trial") {
    return "TRIAL (PRO ACCESS)";
  }

  return subscription.status.toUpperCase();
}

function formatMoney(value, currency = "USD") {
  if (value === null || value === undefined) {
    return "Not recorded";
  }

  return `${currency} ${Number(value).toLocaleString()}`;
}

function formatBillingCycle(value) {
  return value === "annual" ? "Annual" : "Monthly";
}

function formatUsageCount(value, limit) {
  return `${value} used / ${formatLimit(limit)}`;
}

function SubscriptionScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManage = user?.roleCodes?.some((roleCode) =>
    ["super_admin", "vendor_admin"].includes(roleCode)
  );

  async function loadSubscription() {
    setIsLoading(true);
    setError("");

    try {
      const response = await getSubscription();
      setSubscription(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "We could not load the subscription details."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();
  }, []);

  async function handleUpgrade(plan) {
    setIsSubmitting(true);

    try {
      const response = await upgradeSubscription(plan);
      setSubscription(response.data);
      showToast({
        title: "Subscription updated",
        message: `The workspace is now on the ${plan} plan.`,
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        title: "Upgrade failed",
        message: getApiErrorMessage(requestError, "We could not update the subscription."),
        tone: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel the current subscription? The workspace will fall back to free access limits.")) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await cancelSubscription();
      setSubscription(response.data);
      showToast({
        title: "Subscription cancelled",
        message: "The workspace has been moved back to restricted access.",
        tone: "info"
      });
    } catch (requestError) {
      showToast({
        title: "Cancellation failed",
        message: getApiErrorMessage(requestError, "We could not cancel the subscription."),
        tone: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        eyebrow="Billing"
        title="Subscription"
        description="Your workspace is currently on a trial with full Pro access. After the trial ends, it will automatically move to the Free plan unless upgraded."
      />

      {error ? <ErrorState message={error} onRetry={loadSubscription} /> : null}
      {isLoading ? <LoadingState>Loading subscription…</LoadingState> : null}

      {!isLoading && subscription ? (
        <>
          <section className="transaction-panel">
            <SectionHeader
              title="Current access"
              hint={`${subscription.vendor.displayName} (${subscription.vendor.slug})`}
            />
            <div className="subscription-summary-grid">
              <article className="subscription-stat">
                <span>Current access</span>
                <strong>{subscription.effectiveAccess?.toUpperCase() || subscription.plan.toUpperCase()}</strong>
                <small>Base Plan: {subscription.basePlan.toUpperCase()}</small>
              </article>
              <article className="subscription-stat">
                <span>Status</span>
                <strong>{formatStatus(subscription)}</strong>
                <small>{formatBillingCycle(subscription.billingCycle)} billing cycle</small>
              </article>
              <article className="subscription-stat">
                <span>Trial ends</span>
                <strong>{formatDate(subscription.trialEndsAt)}</strong>
                <small>{subscription.trialRemainingDays} trial day(s) remaining</small>
              </article>
              <article className="subscription-stat">
                <span>Period ends</span>
                <strong>{formatDate(subscription.currentPeriodEnd || subscription.expiresAt)}</strong>
                <small>{subscription.annualBenefit?.label || "Annual plan includes 3 free months"}</small>
              </article>
            </div>
          </section>

          <section className="transaction-panel">
            <SectionHeader title="Usage and limits" hint="Current month invoice usage resets automatically." />
            <div className="subscription-usage-grid">
              <article className="subscription-usage-card">
                <span>Customers</span>
                <strong>{formatUsageCount(subscription.usage.customers, subscription.limits.maxCustomers)}</strong>
              </article>
              <article className="subscription-usage-card">
                <span>Invoices this month</span>
                <strong>{formatUsageCount(subscription.usage.invoicesThisMonth, subscription.limits.maxInvoicesPerMonth)}</strong>
              </article>
            </div>
          </section>

          <section className="transaction-panel">
            <SectionHeader title="Latest payment" hint="Manual payments are recorded by the platform admin." />
            <div className="subscription-usage-grid">
              <article className="subscription-usage-card">
                <span>Last payment</span>
                <strong>
                  {formatMoney(subscription.latestPayment?.amount, subscription.latestPayment?.currency)}
                </strong>
              </article>
              <article className="subscription-usage-card">
                <span>Payment date</span>
                <strong>{formatDate(subscription.latestPayment?.paidAt)}</strong>
              </article>
            </div>
          </section>

          {canManage ? (
            <section className="transaction-panel">
              <SectionHeader title="Plan actions" hint="Plan upgrades are currently applied instantly. Payment integration will be enabled soon." />
              <div className="button-row subscription-actions">
                <button
                  className="primary-button"
                  disabled={isSubmitting}
                  onClick={() => handleUpgrade("basic")}
                  type="button"
                >
                  {isSubmitting ? "Working..." : "Upgrade to Basic Plan"}
                </button>
                <button
                  className="primary-button"
                  disabled={isSubmitting}
                  onClick={() => handleUpgrade("pro")}
                  type="button"
                >
                  {isSubmitting ? "Working..." : "Upgrade to Pro Plan"}
                </button>
                <button
                  className="secondary-button"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel Subscription
                </button>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default SubscriptionScreen;
