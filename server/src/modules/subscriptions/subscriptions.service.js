import AppError from "../../core/errors/AppError.js";
import {
  createSubscription,
  findConflictingLiveSubscription,
  findCurrentSubscriptionByVendorId,
  findSubscriptionById,
  findVendorById,
  getVendorOverview,
  listSubscriptions,
  updateSubscription,
  updateVendorStatus
} from "./subscriptions.repository.js";

const SUBSCRIPTION_FIELDS = {
  vendorId: "vendor_id",
  planCode: "plan_code",
  status: "status",
  startsAt: "current_period_start",
  endsAt: "current_period_end",
  currentPeriodStart: "current_period_start",
  currentPeriodEnd: "current_period_end",
  trialEndsAt: "trial_ends_at",
  billingCycle: "billing_cycle",
  metadata: "metadata"
};

function withNotesInMetadata(payload = {}) {
  if (!Object.prototype.hasOwnProperty.call(payload, "notes")) {
    return payload.metadata || {};
  }

  return {
    ...(payload.metadata || {}),
    notes: payload.notes
  };
}

function buildUpdatedMetadata(existingMetadata = {}, payload = {}) {
  const hasMetadata = Object.prototype.hasOwnProperty.call(payload, "metadata");
  const hasNotes = Object.prototype.hasOwnProperty.call(payload, "notes");

  if (!hasMetadata && !hasNotes) {
    return undefined;
  }

  return withNotesInMetadata({
    metadata: {
      ...(existingMetadata || {}),
      ...(payload.metadata || {})
    },
    ...(hasNotes ? { notes: payload.notes } : {})
  });
}

function toColumnPayload(input = {}, fieldMap) {
  const payload = {};

  Object.entries(fieldMap).forEach(([inputKey, column]) => {
    if (Object.prototype.hasOwnProperty.call(input, inputKey)) {
      payload[column] = input[inputKey];
    }
  });

  return payload;
}

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

function mapSubscription(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorId: row.vendor_id,
    planCode: row.plan_code,
    status: row.status,
    billingCycle: row.billing_cycle,
    startsAt: row.current_period_start,
    endsAt: row.current_period_end,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
    metadata: row.metadata || {},
    notes: row.metadata?.notes || null,
    vendor: mapVendor(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapVendorOverview(row, subscription) {
  return {
    vendor: {
      id: row.id,
      legalName: row.legal_name,
      displayName: row.display_name,
      slug: row.slug,
      status: row.status,
      contactEmail: row.contact_email,
      createdAt: row.created_at
    },
    currentSubscription: mapSubscription(subscription),
    counts: {
      members: row.member_count,
      customers: row.customer_count,
      products: row.product_count,
      orders: row.order_count,
      invoices: row.invoice_count
    }
  };
}

function assertSubscriptionFound(row, subscriptionId) {
  if (!row) {
    throw new AppError("Subscription not found", {
      statusCode: 404,
      code: "SUBSCRIPTION_NOT_FOUND",
      details: subscriptionId
        ? [
            {
              path: "subscriptionId",
              message: `No subscription was found for ${subscriptionId}`
            }
          ]
        : []
    });
  }
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

async function assertNoConflictingLiveSubscription(vendorId, status, excludeSubscriptionId = null) {
  if (!["trialing", "active", "past_due"].includes(status)) {
    return;
  }

  const conflict = await findConflictingLiveSubscription(vendorId, excludeSubscriptionId);

  if (conflict) {
    throw new AppError("Vendor already has a live subscription", {
      statusCode: 409,
      code: "LIVE_SUBSCRIPTION_EXISTS",
      details: [
        {
          path: "vendorId",
          message: "Cancel or expire the existing live subscription before creating another live one"
        }
      ]
    });
  }
}

async function getSubscriptionDirectory(query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listSubscriptions({
    vendorId: query.vendorId || null,
    status: query.status || null,
    planCode: query.planCode || null,
    search: query.search || null,
    periodStartFrom: query.periodStartFrom || null,
    periodStartTo: query.periodStartTo || null,
    periodEndFrom: query.periodEndFrom || null,
    periodEndTo: query.periodEndTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapSubscription),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      vendorId: query.vendorId || null,
      status: query.status || null,
      planCode: query.planCode || null,
      search: query.search || null,
      periodStartFrom: query.periodStartFrom || null,
      periodStartTo: query.periodStartTo || null,
      periodEndFrom: query.periodEndFrom || null,
      periodEndTo: query.periodEndTo || null
    }
  };
}

async function getSubscriptionDetail(subscriptionId) {
  const subscription = await findSubscriptionById(subscriptionId);

  assertSubscriptionFound(subscription, subscriptionId);

  return mapSubscription(subscription);
}

async function createVendorSubscription(payload) {
  const vendor = await findVendorById(payload.vendorId);

  assertVendorFound(vendor, payload.vendorId);
  await assertNoConflictingLiveSubscription(payload.vendorId, payload.status || "trialing");

  const subscription = await createSubscription({
    ...toColumnPayload(payload, SUBSCRIPTION_FIELDS),
    metadata: withNotesInMetadata(payload)
  });

  return mapSubscription(subscription);
}

async function updateVendorSubscription(subscriptionId, payload) {
  const existing = await findSubscriptionById(subscriptionId);

  assertSubscriptionFound(existing, subscriptionId);

  if (payload.status) {
    await assertNoConflictingLiveSubscription(existing.vendor_id, payload.status, subscriptionId);
  }

  const subscription = await updateSubscription(subscriptionId, {
    ...toColumnPayload(payload, SUBSCRIPTION_FIELDS),
    metadata: buildUpdatedMetadata(existing.metadata, payload)
  });

  assertSubscriptionFound(subscription, subscriptionId);

  return mapSubscription(subscription);
}

async function getCurrentVendorSubscription(vendorId) {
  const vendor = await findVendorById(vendorId);

  assertVendorFound(vendor, vendorId);

  return {
    vendor: mapVendor(vendor),
    subscription: mapSubscription(await findCurrentSubscriptionByVendorId(vendorId))
  };
}

async function changeVendorStatus(vendorId, payload) {
  const existing = await findVendorById(vendorId);

  assertVendorFound(existing, vendorId);

  const vendor = await updateVendorStatus(vendorId, payload.status);

  return {
    vendor: mapVendor(vendor),
    statusChange: {
      previousStatus: existing.status,
      nextStatus: vendor.status,
      reason: payload.reason || null
    },
    note: "Vendor status is a platform control. Broad enforcement across vendor workflows can be layered in a future policy module."
  };
}

async function getAdminVendorOverview(vendorId) {
  const overview = await getVendorOverview(vendorId);

  assertVendorFound(overview, vendorId);

  return mapVendorOverview(overview, await findCurrentSubscriptionByVendorId(vendorId));
}

export {
  changeVendorStatus,
  createVendorSubscription,
  getAdminVendorOverview,
  getCurrentVendorSubscription,
  getSubscriptionDetail,
  getSubscriptionDirectory,
  updateVendorSubscription
};
