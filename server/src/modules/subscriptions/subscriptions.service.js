import AppError from "../../core/errors/AppError.js";
import { withTransaction } from "../../config/db.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import {
  countCustomersForVendor,
  countInvoicesForVendorCurrentMonth,
  createSubscription,
  createSubscriptionPayment,
  findPlanConfigByCode,
  findLatestSubscriptionPaymentForVendor,
  findSubscriptionByVendorId,
  findVendorById,
  listPlanConfigs,
  listSubscriptionPayments,
  listSubscriptionsForAdmin,
  updatePlanConfigByCode,
  updateSubscriptionByVendorId
} from "./subscriptions.repository.js";
import {
  BILLING_CYCLES,
  getFallbackPlanConfig,
  getPlanConfig,
  mapPlanConfig,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_CODES,
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

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function diffDays(now, futureDate) {
  if (!futureDate) {
    return 0;
  }

  const difference = futureDate.getTime() - now.getTime();
  return difference <= 0 ? 0 : Math.ceil(difference / (24 * 60 * 60 * 1000));
}

async function ensureSubscriptionRecord(vendorId, client) {
  let subscription = await findSubscriptionByVendorId(vendorId, client);

  if (subscription) {
    return subscription;
  }

  const now = new Date();
  subscription = await createSubscription(
    {
      vendor_id: vendorId,
      plan: "free",
      status: "trial",
      billing_cycle: "monthly",
      started_at: now.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: addDays(now, TRIAL_LENGTH_DAYS).toISOString(),
      trial_ends_at: addDays(now, TRIAL_LENGTH_DAYS).toISOString(),
      expires_at: null
    },
    client
  );

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

async function getEffectivePlanConfig(planCode) {
  const dbPlan = await findPlanConfigByCode(planCode).catch(() => null);

  return getPlanConfig(planCode, dbPlan);
}

function buildLimitResponse(plan) {
  return {
    maxCustomers: plan.maxCustomers,
    maxInvoicesPerMonth: plan.maxInvoicesPerMonth
  };
}

function buildAnnualBenefit(plan) {
  return {
    freeMonths: plan.annualFreeMonths,
    paidMonths: 12,
    totalMonths: 12 + plan.annualFreeMonths,
    label:
      plan.annualFreeMonths > 0
        ? `Annual plan includes ${plan.annualFreeMonths} free months`
        : "Annual plan uses standard 12-month billing"
  };
}

function mapSubscriptionRow(row, planConfig, usage = null) {
  const state = resolveSubscriptionState(row);

  return {
    id: row.id,
    vendor: mapVendor(row),
    basePlan: row.plan,
    currentPlan: row.plan,
    plan: state.effectivePlan,
    effectiveAccess: state.effectivePlan,
    planConfig,
    status: state.effectiveStatus,
    subscriptionStatus: row.status,
    billingCycle: row.billing_cycle || "monthly",
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end || row.expires_at,
    trialEndsAt: row.trial_ends_at,
    trialRemainingDays: state.trialRemainingDays,
    adminNotes: row.admin_notes,
    managedByAdmin: row.managed_by_admin,
    limits: buildLimitResponse(planConfig),
    usage,
    annualBenefit: buildAnnualBenefit(planConfig),
    latestPayment: row.latestPayment || null
  };
}

function mapPaymentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendor: row.vendor_id
      ? {
          id: row.vendor_id,
          displayName: row.vendor_display_name || null,
          legalName: row.vendor_legal_name || null,
          slug: row.vendor_slug || null
        }
      : null,
    subscriptionId: row.subscription_id,
    planCode: row.plan_code,
    billingCycle: row.billing_cycle,
    amount: Number(row.amount),
    currency: row.currency,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    notes: row.notes,
    recordedBy: row.recorded_by
      ? {
          id: row.recorded_by,
          display: row.recorded_by_full_name || row.recorded_by_email || null,
          fullName: row.recorded_by_full_name,
          email: row.recorded_by_email
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function buildSubscriptionSummary(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  const subscription = await ensureSubscriptionRecord(vendorId);
  const state = resolveSubscriptionState(subscription);
  const [usage, latestPayment] = await Promise.all([
    getSubscriptionUsage(vendorId),
    findLatestSubscriptionPaymentForVendor(vendorId).catch(() => null)
  ]);
  const planConfig = await getEffectivePlanConfig(state.effectivePlan);

  return mapSubscriptionRow(
    {
      ...subscription,
      latestPayment: mapPaymentRow(latestPayment)
    },
    planConfig,
    usage
  );
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
    billing_cycle: "monthly",
    started_at: now.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: addDays(now, UPGRADE_LENGTH_DAYS).toISOString(),
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
    current_period_end: new Date().toISOString(),
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
    managed_by_admin: true,
    trial_ends_at: addDays(anchor, days).toISOString()
  });

  return buildSubscriptionSummary(vendorId);
}

function assertPlanCode(planCode) {
  if (!SUBSCRIPTION_PLAN_CODES.includes(planCode)) {
    throw new AppError("Unknown subscription plan", {
      statusCode: 404,
      code: "PLAN_NOT_FOUND"
    });
  }
}

function assertBillingCycle(billingCycle) {
  if (billingCycle && !BILLING_CYCLES.includes(billingCycle)) {
    throw new AppError("Unsupported billing cycle", {
      statusCode: 422,
      code: "INVALID_BILLING_CYCLE"
    });
  }
}

function buildPeriodEnd(start, billingCycle, annualFreeMonths = 3) {
  if (billingCycle === "annual") {
    return addMonths(start, 12 + annualFreeMonths);
  }

  return addMonths(start, 1);
}

function getPaymentPeriod(subscription, billingCycle, annualFreeMonths, paidAt = new Date()) {
  const currentPeriodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const start =
    currentPeriodEnd instanceof Date &&
    !Number.isNaN(currentPeriodEnd.valueOf()) &&
    currentPeriodEnd > paidAt
      ? currentPeriodEnd
      : paidAt;

  return {
    start,
    end: buildPeriodEnd(start, billingCycle, annualFreeMonths)
  };
}

function mapPlanUpdatePayload(payload) {
  return {
    display_name: payload.displayName,
    monthly_price: payload.monthlyPrice,
    annual_price: payload.annualPrice,
    annual_free_months: payload.annualFreeMonths,
    max_customers: payload.maxCustomers,
    max_invoices_per_month: payload.maxInvoicesPerMonth,
    is_active: payload.isActive
  };
}

async function getBillingPlans() {
  const rows = await listPlanConfigs().catch(() => []);
  const plansByCode = new Map(rows.map((row) => [row.plan_code, mapPlanConfig(row)]));

  return SUBSCRIPTION_PLAN_CODES.map((planCode) => {
    const plan = plansByCode.get(planCode) || getFallbackPlanConfig(planCode);

    return {
      ...plan,
      annualBenefit: buildAnnualBenefit(plan)
    };
  });
}

async function updateBillingPlan(planCode, payload, actor = {}, requestId = null) {
  assertPlanCode(planCode);

  const existing = await findPlanConfigByCode(planCode);
  if (!existing) {
    throw new AppError("Plan configuration is missing", {
      statusCode: 404,
      code: "PLAN_CONFIG_NOT_FOUND"
    });
  }

  const updated = await updatePlanConfigByCode(planCode, mapPlanUpdatePayload(payload));
  const mapped = mapPlanConfig(updated);

  await recordAuditEvent({
    vendorId: null,
    actor,
    entityType: "subscription_plan_config",
    entityId: null,
    eventType: "billing.plan_config.updated",
    eventLabel: `Updated ${mapped.displayName} plan configuration`,
    metadata: {
      planCode,
      before: mapPlanConfig(existing),
      after: mapped
    },
    requestId
  });

  return mapped;
}

async function getAdminSubscriptions(filters = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const result = await listSubscriptionsForAdmin({
    search: filters.search || null,
    status: filters.status || null,
    plan: filters.plan || null,
    billingCycle: filters.billingCycle || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  const plans = await getBillingPlans();
  const plansByCode = new Map(plans.map((plan) => [plan.code, plan]));

  return {
    items: result.rows.map((row) => {
      const state = resolveSubscriptionState(row);
      const planConfig = plansByCode.get(state.effectivePlan) || getFallbackPlanConfig(state.effectivePlan);

      return mapSubscriptionRow(row, planConfig, {
        customers: row.customer_count || 0,
        invoicesThisMonth: row.invoice_count || 0
      });
    }),
    plans,
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    }
  };
}

async function updateVendorSubscriptionByAdmin(vendorId, payload, actor = {}, requestId = null) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  const subscription = await ensureSubscriptionRecord(vendorId);
  const nextPlan = payload.plan || subscription.plan || "free";
  const nextBillingCycle = payload.billingCycle || subscription.billing_cycle || "monthly";
  assertPlanCode(nextPlan);
  assertBillingCycle(nextBillingCycle);

  const planConfig = await getEffectivePlanConfig(nextPlan);
  const now = new Date();
  const updates = {
    plan: payload.plan,
    status: payload.status,
    billing_cycle: payload.billingCycle,
    current_period_start: payload.currentPeriodStart,
    current_period_end: payload.currentPeriodEnd,
    expires_at: payload.expiresAt,
    trial_ends_at: payload.trialEndsAt,
    admin_notes: payload.adminNotes,
    managed_by_admin: true
  };

  if (payload.status === "active" && !payload.currentPeriodStart) {
    updates.current_period_start = now.toISOString();
    updates.started_at = subscription.started_at || now.toISOString();
  }

  if (["cancelled", "expired"].includes(payload.status)) {
    updates.current_period_end = payload.currentPeriodEnd || now.toISOString();
    updates.expires_at = payload.expiresAt || payload.currentPeriodEnd || now.toISOString();
  } else if (payload.status === "active" && !payload.currentPeriodEnd && !payload.expiresAt) {
    updates.current_period_end = buildPeriodEnd(now, nextBillingCycle, planConfig.annualFreeMonths).toISOString();
    updates.expires_at = updates.current_period_end;
  } else if (payload.currentPeriodEnd && !payload.expiresAt) {
    updates.expires_at = payload.currentPeriodEnd;
  }

  if (payload.extendTrialDays) {
    const currentTrialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : now;
    const anchor = currentTrialEnd > now ? currentTrialEnd : now;
    updates.status = "trial";
    updates.trial_ends_at = addDays(anchor, payload.extendTrialDays).toISOString();
  }

  const updated = await updateSubscriptionByVendorId(vendorId, updates);
  const eventTypes = new Set(["billing.vendor_subscription.updated"]);

  if (payload.extendTrialDays) {
    eventTypes.add("billing.trial.extended");
  }

  if (payload.status === "active") eventTypes.add("billing.subscription.activated");
  if (payload.status === "cancelled") eventTypes.add("billing.subscription.cancelled");
  if (payload.status === "expired") eventTypes.add("billing.subscription.expired");

  await Promise.all(
    [...eventTypes].map((eventType) =>
      recordAuditEvent({
        vendorId,
        actor,
        entityType: "subscription",
        entityId: updated.id,
        eventType,
        eventLabel: "Vendor subscription updated by platform admin",
        metadata: {
          before: {
            plan: subscription.plan,
            status: subscription.status,
            billingCycle: subscription.billing_cycle,
            currentPeriodEnd: subscription.current_period_end,
            trialEndsAt: subscription.trial_ends_at
          },
          after: {
            plan: updated.plan,
            status: updated.status,
            billingCycle: updated.billing_cycle,
            currentPeriodEnd: updated.current_period_end,
            trialEndsAt: updated.trial_ends_at
          },
          requestedChanges: payload
        },
        requestId
      })
    )
  );

  return buildSubscriptionSummary(vendorId);
}

async function getBillingPayments(filters = {}) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const result = await listSubscriptionPayments({
    search: filters.search || null,
    status: filters.status || null,
    vendorId: filters.vendorId || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapPaymentRow),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    }
  };
}

async function recordManualSubscriptionPayment(payload, actor = {}, requestId = null) {
  const vendor = await findVendorById(payload.vendorId);
  assertVendorFound(vendor, payload.vendorId);
  assertPlanCode(payload.planCode);
  assertBillingCycle(payload.billingCycle);

  if (payload.planCode !== "free" && Number(payload.amount) <= 0) {
    throw new AppError("Paid plans require a payment amount greater than zero", {
      statusCode: 422,
      code: "PAYMENT_AMOUNT_REQUIRED",
      details: [
        {
          path: "amount",
          message: "Paid plans require a payment amount greater than zero."
        }
      ]
    });
  }

  const planConfig = await getEffectivePlanConfig(payload.planCode);
  const paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date();

  const result = await withTransaction(async (client) => {
    const subscription = await ensureSubscriptionRecord(payload.vendorId, client);
    const period =
      payload.paymentStatus === "received"
        ? getPaymentPeriod(subscription, payload.billingCycle, planConfig.annualFreeMonths, paidAt)
        : { start: null, end: null };

    const payment = await createSubscriptionPayment(
      {
        vendor_id: payload.vendorId,
        subscription_id: subscription.id,
        plan_code: payload.planCode,
        billing_cycle: payload.billingCycle,
        amount: payload.amount,
        currency: payload.currency || vendor.currency_code || "USD",
        payment_method: payload.paymentMethod,
        payment_reference: payload.paymentReference,
        payment_status: payload.paymentStatus,
        paid_at: payload.paymentStatus === "received" ? paidAt.toISOString() : payload.paidAt || null,
        period_start: period.start?.toISOString() || null,
        period_end: period.end?.toISOString() || null,
        notes: payload.notes,
        recorded_by: actor.userId || null
      },
      client
    );

    let updatedSubscription = subscription;
    if (payload.paymentStatus === "received") {
      updatedSubscription = await updateSubscriptionByVendorId(
        payload.vendorId,
        {
          plan: payload.planCode,
          status: "active",
          billing_cycle: payload.billingCycle,
          started_at: subscription.started_at || paidAt.toISOString(),
          expires_at: period.end.toISOString(),
          current_period_start: period.start.toISOString(),
          current_period_end: period.end.toISOString(),
          managed_by_admin: true
        },
        client
      );
    }

    return {
      payment,
      subscription,
      updatedSubscription
    };
  });

  const payment = mapPaymentRow({
    ...result.payment,
    vendor_display_name: vendor.display_name,
    vendor_legal_name: vendor.legal_name,
    vendor_slug: vendor.slug,
    recorded_by_full_name: actor.user?.fullName,
    recorded_by_email: actor.user?.email
  });
  const eventType =
    payload.paymentStatus === "pending"
      ? "billing.pending_payment.recorded"
      : "billing.manual_payment.recorded";

  await recordAuditEvent({
    vendorId: payload.vendorId,
    actor,
    entityType: "subscription_payment",
    entityId: payment.id,
    eventType,
    eventLabel:
      payload.paymentStatus === "pending"
        ? "Pending manual subscription payment recorded"
        : "Manual subscription payment recorded",
    metadata: {
      payment,
      subscriptionId: result.updatedSubscription.id
    },
    requestId
  });

  if (payload.paymentStatus === "received") {
    await recordAuditEvent({
      vendorId: payload.vendorId,
      actor,
      entityType: "subscription",
      entityId: result.updatedSubscription.id,
      eventType: "billing.subscription.activated_from_payment",
      eventLabel: "Subscription activated from manual payment",
      metadata: {
        paymentId: payment.id,
        before: {
          plan: result.subscription.plan,
          status: result.subscription.status,
          billingCycle: result.subscription.billing_cycle,
          currentPeriodEnd: result.subscription.current_period_end
        },
        after: {
          plan: result.updatedSubscription.plan,
          status: result.updatedSubscription.status,
          billingCycle: result.updatedSubscription.billing_cycle,
          currentPeriodEnd: result.updatedSubscription.current_period_end
        }
      },
      requestId
    });
  }

  return payment;
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
  getAdminSubscriptions,
  getBillingPayments,
  getBillingPlans,
  getCurrentVendorSubscription,
  recordManualSubscriptionPayment,
  SUBSCRIPTION_PLANS,
  extendVendorTrial,
  updateBillingPlan,
  updateVendorSubscriptionByAdmin,
  upgradeCurrentVendorSubscription
};
