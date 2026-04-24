import AppError from "../../core/errors/AppError.js";
import {
  countCustomersForVendor,
  countInvoicesForVendorCurrentMonth,
  createSubscription,
  findSubscriptionByVendorId,
  findVendorById,
  updateSubscriptionByVendorId
} from "./subscriptions.repository.js";
import {
  getPlanConfig,
  SUBSCRIPTION_PLANS,
  TRIAL_LENGTH_DAYS,
  UPGRADE_LENGTH_DAYS
} from "./subscriptionPlans.js";

const ACTION_LIMITS = {
  create_customer: {
    usageKey: "customers",
    limitKey: "maxCustomers",
    message: "Customer limit reached for the current plan."
  },
  create_invoice: {
    usageKey: "invoicesThisMonth",
    limitKey: "maxInvoicesPerMonth",
    message: "Monthly invoice limit reached for the current plan."
  }
};

function mapVendor(row) {
  return {
    id: row.vendor_id || row.id,
    legalName: row.vendor_legal_name || row.legal_name,
    displayName: row.vendor_display_name || row.display_name,
    slug: row.vendor_slug || row.slug,
    status: row.vendor_status || row.status,
    contactEmail: row.vendor_contact_email || row.contact_email,
    contactPhone: row.contact_phone,
    currencyCode: row.currency_code,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertVendorFound(row, vendorId) {
  if (!row) {
    throw new AppError("Vendor not found", {
      statusCode: 404,
      code: "VENDOR_NOT_FOUND",
      details: [
        {
          path: "vendorId",
          message: `No vendor was found for ${vendorId}`
        }
      ]
    });
  }
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function diffDays(now, futureDate) {
  if (!futureDate) {
    return 0;
  }

  const difference = futureDate.getTime() - now.getTime();
  return difference <= 0 ? 0 : Math.ceil(difference / (24 * 60 * 60 * 1000));
}

async function ensureSubscriptionRecord(vendorId) {
  let subscription = await findSubscriptionByVendorId(vendorId);

  if (subscription) {
    return subscription;
  }

  const now = new Date();
  subscription = await createSubscription({
    vendor_id: vendorId,
    plan: "free",
    status: "trial",
    started_at: now.toISOString(),
    trial_ends_at: addDays(now, TRIAL_LENGTH_DAYS).toISOString(),
    expires_at: null
  });

  return subscription;
}

function resolveSubscriptionState(subscription) {
  const now = new Date();
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const isTrialActive =
    subscription?.status === "trial" &&
    trialEndsAt instanceof Date &&
    !Number.isNaN(trialEndsAt.valueOf()) &&
    trialEndsAt > now;

  let effectivePlan = subscription?.plan || "free";
  let effectiveStatus = subscription?.status || "expired";

  if (isTrialActive) {
    effectivePlan = "pro";
    effectiveStatus = "trial";
  } else if (subscription?.status === "trial") {
    effectivePlan = "free";
    effectiveStatus = "active";
  } else if (
    subscription?.status === "active" &&
    expiresAt instanceof Date &&
    !Number.isNaN(expiresAt.valueOf()) &&
    expiresAt <= now
  ) {
    effectivePlan = "free";
    effectiveStatus = "expired";
  } else if (["cancelled", "expired"].includes(subscription?.status)) {
    effectivePlan = "free";
    effectiveStatus = subscription.status;
  }

  return {
    now,
    effectivePlan,
    effectiveStatus,
    isTrialActive,
    trialEndsAt,
    expiresAt,
    trialRemainingDays: diffDays(now, trialEndsAt)
  };
}

async function getSubscriptionUsage(vendorId) {
  const [customers, invoicesThisMonth] = await Promise.all([
    countCustomersForVendor(vendorId),
    countInvoicesForVendorCurrentMonth(vendorId)
  ]);

  return {
    customers,
    invoicesThisMonth
  };
}

function buildLimitResponse(planCode) {
  const plan = getPlanConfig(planCode);

  return {
    maxCustomers: plan.maxCustomers,
    maxInvoicesPerMonth: plan.maxInvoicesPerMonth
  };
}

async function buildSubscriptionSummary(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  const subscription = await ensureSubscriptionRecord(vendorId);
  const state = resolveSubscriptionState(subscription);
  const usage = await getSubscriptionUsage(vendorId);

  return {
    id: subscription.id,
    vendor: mapVendor(vendor),
    basePlan: subscription.plan,
    plan: state.effectivePlan,
    status: state.effectiveStatus,
    startedAt: subscription.started_at,
    expiresAt: subscription.expires_at,
    trialEndsAt: subscription.trial_ends_at,
    trialRemainingDays: state.trialRemainingDays,
    limits: buildLimitResponse(state.effectivePlan),
    usage
  };
}

async function getCurrentVendorSubscription(vendorId) {
  return buildSubscriptionSummary(vendorId);
}

async function upgradeCurrentVendorSubscription(vendorId, plan) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);
  await ensureSubscriptionRecord(vendorId);

  const now = new Date();

  await updateSubscriptionByVendorId(vendorId, {
    plan,
    status: "active",
    started_at: now.toISOString(),
    expires_at: addDays(now, UPGRADE_LENGTH_DAYS).toISOString()
  });

  return buildSubscriptionSummary(vendorId);
}

async function cancelCurrentVendorSubscription(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);
  await ensureSubscriptionRecord(vendorId);

  await updateSubscriptionByVendorId(vendorId, {
    status: "cancelled",
    expires_at: new Date().toISOString()
  });

  return buildSubscriptionSummary(vendorId);
}

async function extendVendorTrial(vendorId, days) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  const subscription = await ensureSubscriptionRecord(vendorId);
  const currentTrialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : new Date();
  const anchor = currentTrialEnd > new Date() ? currentTrialEnd : new Date();

  await updateSubscriptionByVendorId(vendorId, {
    status: "trial",
    trial_ends_at: addDays(anchor, days).toISOString()
  });

  return buildSubscriptionSummary(vendorId);
}

async function assertSubscriptionAccess(vendorId, actionType) {
  const action = ACTION_LIMITS[actionType];

  if (!action) {
    throw new AppError("Unsupported subscription access action", {
      statusCode: 500,
      code: "SUBSCRIPTION_ACTION_NOT_CONFIGURED"
    });
  }

  const summary = await buildSubscriptionSummary(vendorId);
  const limit = summary.limits[action.limitKey];
  const usageValue = summary.usage[action.usageKey];

  if (limit === null || limit === undefined) {
    return summary;
  }

  if (usageValue < limit) {
    return summary;
  }

  throw new AppError(action.message, {
    statusCode: 403,
    code: "PLAN_LIMIT_EXCEEDED",
    details: [
      {
        path: action.usageKey,
        message: `${action.message} Current usage: ${usageValue}/${limit}.`
      }
    ]
  });
}

export {
  assertSubscriptionAccess,
  buildSubscriptionSummary,
  cancelCurrentVendorSubscription,
  getCurrentVendorSubscription,
  SUBSCRIPTION_PLANS,
  extendVendorTrial,
  upgradeCurrentVendorSubscription
};
