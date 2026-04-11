import { query } from "../../config/db.js";

const SUBSCRIPTION_SELECT = `subscription.id,
                             subscription.vendor_id,
                             subscription.plan_code,
                             subscription.status,
                             subscription.billing_cycle,
                             subscription.current_period_start,
                             subscription.current_period_end,
                             subscription.trial_ends_at,
                             subscription.metadata,
                             subscription.created_at,
                             subscription.updated_at,
                             vendor.legal_name AS vendor_legal_name,
                             vendor.display_name AS vendor_display_name,
                             vendor.slug AS vendor_slug,
                             vendor.status AS vendor_status,
                             vendor.contact_email AS vendor_contact_email`;

const SUBSCRIPTION_RETURNING = `id,
                                vendor_id,
                                plan_code,
                                status,
                                billing_cycle,
                                current_period_start,
                                current_period_end,
                                trial_ends_at,
                                metadata,
                                created_at,
                                updated_at`;

const VENDOR_SELECT = `vendor.id,
                       vendor.legal_name,
                       vendor.display_name,
                       vendor.slug,
                       vendor.status,
                       vendor.contact_email,
                       vendor.contact_phone,
                       vendor.currency_code,
                       vendor.timezone,
                       vendor.created_at,
                       vendor.updated_at`;

function subscriptionJoinClause() {
  return `FROM subscriptions subscription
          INNER JOIN vendors vendor ON vendor.id = subscription.vendor_id`;
}

async function findVendorById(vendorId) {
  const result = await query(
    `SELECT ${VENDOR_SELECT}
     FROM vendors vendor
     WHERE vendor.id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function listSubscriptions({
  vendorId = null,
  status = null,
  planCode = null,
  search = null,
  periodStartFrom = null,
  periodStartTo = null,
  periodEndFrom = null,
  periodEndTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = [];
  const values = [];

  if (vendorId) {
    values.push(vendorId);
    conditions.push(`subscription.vendor_id = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`subscription.status = $${values.length}`);
  }

  if (planCode) {
    values.push(planCode);
    conditions.push(`subscription.plan_code = $${values.length}`);
  }

  if (periodStartFrom) {
    values.push(periodStartFrom);
    conditions.push(`subscription.current_period_start >= $${values.length}`);
  }

  if (periodStartTo) {
    values.push(periodStartTo);
    conditions.push(`subscription.current_period_start <= $${values.length}`);
  }

  if (periodEndFrom) {
    values.push(periodEndFrom);
    conditions.push(`subscription.current_period_end >= $${values.length}`);
  }

  if (periodEndTo) {
    values.push(periodEndTo);
    conditions.push(`subscription.current_period_end <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      subscription.plan_code ILIKE $${values.length}
      OR vendor.legal_name ILIKE $${values.length}
      OR vendor.display_name ILIKE $${values.length}
      OR vendor.slug ILIKE $${values.length}
      OR COALESCE(vendor.contact_email, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${subscriptionJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${SUBSCRIPTION_SELECT}
     ${subscriptionJoinClause()}
     ${whereClause}
     ORDER BY subscription.created_at DESC, vendor.display_name ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findSubscriptionById(subscriptionId) {
  const result = await query(
    `SELECT ${SUBSCRIPTION_SELECT}
     ${subscriptionJoinClause()}
     WHERE subscription.id = $1
     LIMIT 1`,
    [subscriptionId]
  );

  return result.rows[0] || null;
}

async function findCurrentSubscriptionByVendorId(vendorId) {
  const result = await query(
    `SELECT ${SUBSCRIPTION_SELECT}
     ${subscriptionJoinClause()}
     WHERE subscription.vendor_id = $1
     ORDER BY
       CASE subscription.status
         WHEN 'active' THEN 0
         WHEN 'trialing' THEN 1
         WHEN 'past_due' THEN 2
         ELSE 3
       END,
       subscription.current_period_end DESC NULLS LAST,
       subscription.created_at DESC
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function findConflictingLiveSubscription(vendorId, excludeSubscriptionId = null) {
  const values = [vendorId];
  let excludeClause = "";

  if (excludeSubscriptionId) {
    values.push(excludeSubscriptionId);
    excludeClause = `AND id <> $${values.length}`;
  }

  const result = await query(
    `SELECT id
     FROM subscriptions
     WHERE vendor_id = $1
       AND status IN ('trialing', 'active', 'past_due')
       ${excludeClause}
     LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

async function createSubscription(payload) {
  const result = await query(
    `INSERT INTO subscriptions (
       vendor_id,
       plan_code,
       status,
       billing_cycle,
       current_period_start,
       current_period_end,
       trial_ends_at,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SUBSCRIPTION_RETURNING}`,
    [
      payload.vendor_id,
      payload.plan_code,
      payload.status || "trialing",
      payload.billing_cycle || "monthly",
      payload.current_period_start || null,
      payload.current_period_end || null,
      payload.trial_ends_at || null,
      payload.metadata || {}
    ]
  );

  return findSubscriptionById(result.rows[0].id);
}

async function updateSubscription(subscriptionId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findSubscriptionById(subscriptionId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(subscriptionId);

  const result = await query(
    `UPDATE subscriptions
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return findSubscriptionById(subscriptionId);
}

async function updateVendorStatus(vendorId, status) {
  const result = await query(
    `UPDATE vendors vendor
     SET status = $1,
         updated_at = NOW()
     WHERE vendor.id = $2
     RETURNING ${VENDOR_SELECT}`,
    [status, vendorId]
  );

  return result.rows[0] || null;
}

async function getVendorOverview(vendorId) {
  const result = await query(
    `SELECT vendor.id,
            vendor.legal_name,
            vendor.display_name,
            vendor.slug,
            vendor.status,
            vendor.contact_email,
            vendor.created_at,
            (
              SELECT COUNT(*)::int
              FROM vendor_memberships membership
              WHERE membership.vendor_id = vendor.id
            ) AS member_count,
            (
              SELECT COUNT(*)::int
              FROM vendor_customer_relationships relationship
              WHERE relationship.vendor_id = vendor.id
            ) AS customer_count,
            (
              SELECT COUNT(*)::int
              FROM products product
              WHERE product.vendor_id = vendor.id
            ) AS product_count,
            (
              SELECT COUNT(*)::int
              FROM orders orders
              WHERE orders.vendor_id = vendor.id
            ) AS order_count,
            (
              SELECT COUNT(*)::int
              FROM invoices invoice
              WHERE invoice.vendor_id = vendor.id
            ) AS invoice_count
     FROM vendors vendor
     WHERE vendor.id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

export {
  createSubscription,
  findConflictingLiveSubscription,
  findCurrentSubscriptionByVendorId,
  findSubscriptionById,
  findVendorById,
  getVendorOverview,
  listSubscriptions,
  updateSubscription,
  updateVendorStatus
};
