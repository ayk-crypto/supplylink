import { query } from "../../config/db.js";

const SUBSCRIPTION_SELECT = `subscription.id,
                             subscription.vendor_id,
                             subscription.plan,
                             subscription.status,
                             subscription.billing_cycle,
                             subscription.started_at,
                             subscription.expires_at,
                             subscription.current_period_start,
                             subscription.current_period_end,
                             subscription.trial_ends_at,
                             subscription.admin_notes,
                             subscription.managed_by_admin,
                             subscription.created_at,
                             subscription.updated_at,
                             vendor.legal_name AS vendor_legal_name,
                             vendor.display_name AS vendor_display_name,
                             vendor.slug AS vendor_slug,
                             vendor.status AS vendor_status,
                             vendor.contact_email AS vendor_contact_email,
                             vendor.contact_phone AS contact_phone,
                             vendor.currency_code AS currency_code,
                             vendor.timezone AS timezone`;

const SUBSCRIPTION_RETURNING = `id,
                                vendor_id,
                                plan,
                                status,
                                billing_cycle,
                                started_at,
                                expires_at,
                                current_period_start,
                                current_period_end,
                                trial_ends_at,
                                admin_notes,
                                managed_by_admin,
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

async function findVendorById(vendorId, client = { query }) {
  const result = await client.query(
    `SELECT ${VENDOR_SELECT}
     FROM vendors vendor
     WHERE vendor.id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function findSubscriptionByVendorId(vendorId, client = { query }) {
  const result = await client.query(
    `SELECT ${SUBSCRIPTION_SELECT}
     ${subscriptionJoinClause()}
     WHERE subscription.vendor_id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function createSubscription(payload, client = { query }) {
  const result = await client.query(
    `INSERT INTO subscriptions (
       vendor_id,
       plan,
       status,
       billing_cycle,
       started_at,
       expires_at,
       current_period_start,
       current_period_end,
       trial_ends_at,
       admin_notes,
       managed_by_admin
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING ${SUBSCRIPTION_RETURNING}`,
    [
      payload.vendor_id,
      payload.plan,
      payload.status,
      payload.billing_cycle || "monthly",
      payload.started_at || null,
      payload.expires_at || null,
      payload.current_period_start || payload.started_at || null,
      payload.current_period_end || payload.expires_at || null,
      payload.trial_ends_at || null,
      payload.admin_notes || null,
      payload.managed_by_admin || false
    ]
  );

  return findSubscriptionByVendorId(result.rows[0].vendor_id, client);
}

async function updateSubscriptionByVendorId(vendorId, updates, client = { query }) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findSubscriptionByVendorId(vendorId, client);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);

  const result = await client.query(
    `UPDATE subscriptions
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE vendor_id = $${values.length}
     RETURNING vendor_id`,
    values
  );

  if (!result.rows[0]) {
    return null;
  }

  return findSubscriptionByVendorId(vendorId, client);
}

async function countCustomersForVendor(vendorId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM vendor_customer_relationships
     WHERE vendor_id = $1`,
    [vendorId]
  );

  return result.rows[0]?.total || 0;
}

async function countInvoicesForVendorCurrentMonth(vendorId, client = { query }) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM invoices
     WHERE vendor_id = $1
       AND created_at >= date_trunc('month', NOW())
       AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month'`,
    [vendorId]
  );

  return result.rows[0]?.total || 0;
}

async function createSubscriptionPayment(payload, client = { query }) {
  const result = await client.query(
    `INSERT INTO subscription_payments (
       vendor_id,
       subscription_id,
       plan_code,
       billing_cycle,
       amount,
       currency,
       payment_method,
       payment_reference,
       payment_status,
       paid_at,
       period_start,
       period_end,
       notes,
       recorded_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id,
               vendor_id,
               subscription_id,
               plan_code,
               billing_cycle,
               amount,
               currency,
               payment_method,
               payment_reference,
               payment_status,
               paid_at,
               period_start,
               period_end,
               notes,
               recorded_by,
               created_at,
               updated_at`,
    [
      payload.vendor_id,
      payload.subscription_id || null,
      payload.plan_code,
      payload.billing_cycle,
      payload.amount,
      payload.currency || "USD",
      payload.payment_method,
      payload.payment_reference || null,
      payload.payment_status,
      payload.paid_at || null,
      payload.period_start || null,
      payload.period_end || null,
      payload.notes || null,
      payload.recorded_by || null
    ]
  );

  return result.rows[0];
}

async function listSubscriptionPayments({
  search = null,
  status = null,
  vendorId = null,
  limit = 100,
  offset = 0
} = {}, client = { query }) {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      vendor.legal_name ILIKE $${values.length}
      OR vendor.display_name ILIKE $${values.length}
      OR vendor.slug ILIKE $${values.length}
      OR COALESCE(payment.payment_reference, '') ILIKE $${values.length}
    )`);
  }

  if (status) {
    values.push(status);
    conditions.push(`payment.payment_status = $${values.length}`);
  }

  if (vendorId) {
    values.push(vendorId);
    conditions.push(`payment.vendor_id = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM subscription_payments payment
     INNER JOIN vendors vendor ON vendor.id = payment.vendor_id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await client.query(
    `SELECT payment.id,
            payment.vendor_id,
            payment.subscription_id,
            payment.plan_code,
            payment.billing_cycle,
            payment.amount,
            payment.currency,
            payment.payment_method,
            payment.payment_reference,
            payment.payment_status,
            payment.paid_at,
            payment.period_start,
            payment.period_end,
            payment.notes,
            payment.recorded_by,
            payment.created_at,
            payment.updated_at,
            vendor.display_name AS vendor_display_name,
            vendor.legal_name AS vendor_legal_name,
            vendor.slug AS vendor_slug,
            recorder.full_name AS recorded_by_full_name,
            recorder.email AS recorded_by_email
     FROM subscription_payments payment
     INNER JOIN vendors vendor ON vendor.id = payment.vendor_id
     LEFT JOIN users recorder ON recorder.id = payment.recorded_by
     ${whereClause}
     ORDER BY COALESCE(payment.paid_at, payment.created_at) DESC, payment.created_at DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function findLatestSubscriptionPaymentForVendor(vendorId, client = { query }) {
  const result = await client.query(
    `SELECT payment.id,
            payment.vendor_id,
            payment.subscription_id,
            payment.plan_code,
            payment.billing_cycle,
            payment.amount,
            payment.currency,
            payment.payment_method,
            payment.payment_reference,
            payment.payment_status,
            payment.paid_at,
            payment.period_start,
            payment.period_end,
            payment.notes,
            payment.recorded_by,
            payment.created_at,
            payment.updated_at,
            recorder.full_name AS recorded_by_full_name,
            recorder.email AS recorded_by_email
     FROM subscription_payments payment
     LEFT JOIN users recorder ON recorder.id = payment.recorded_by
     WHERE payment.vendor_id = $1
     ORDER BY COALESCE(payment.paid_at, payment.created_at) DESC, payment.created_at DESC
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function listPlanConfigs(client = { query }) {
  const result = await client.query(
    `SELECT plan_code,
            display_name,
            monthly_price,
            annual_price,
            annual_free_months,
            max_customers,
            max_invoices_per_month,
            is_active,
            created_at,
            updated_at
     FROM subscription_plan_configs
     ORDER BY CASE plan_code
                WHEN 'free' THEN 1
                WHEN 'basic' THEN 2
                WHEN 'pro' THEN 3
                ELSE 4
              END`
  );

  return result.rows;
}

async function findPlanConfigByCode(planCode, client = { query }) {
  const result = await client.query(
    `SELECT plan_code,
            display_name,
            monthly_price,
            annual_price,
            annual_free_months,
            max_customers,
            max_invoices_per_month,
            is_active,
            created_at,
            updated_at
     FROM subscription_plan_configs
     WHERE plan_code = $1
     LIMIT 1`,
    [planCode]
  );

  return result.rows[0] || null;
}

async function updatePlanConfigByCode(planCode, updates, client = { query }) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findPlanConfigByCode(planCode, client);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(planCode);

  const result = await client.query(
    `UPDATE subscription_plan_configs
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE plan_code = $${values.length}
     RETURNING plan_code,
               display_name,
               monthly_price,
               annual_price,
               annual_free_months,
               max_customers,
               max_invoices_per_month,
               is_active,
               created_at,
               updated_at`,
    values
  );

  return result.rows[0] || null;
}

async function listSubscriptionsForAdmin({
  search = null,
  status = null,
  plan = null,
  billingCycle = null,
  limit = 100,
  offset = 0
} = {}, client = { query }) {
  const conditions = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      vendor.legal_name ILIKE $${values.length}
      OR vendor.display_name ILIKE $${values.length}
      OR vendor.slug ILIKE $${values.length}
      OR COALESCE(vendor.contact_email, '') ILIKE $${values.length}
    )`);
  }

  if (status) {
    values.push(status);
    conditions.push(`COALESCE(subscription.status, 'trial') = $${values.length}`);
  }

  if (plan) {
    values.push(plan);
    conditions.push(`COALESCE(subscription.plan, 'free') = $${values.length}`);
  }

  if (billingCycle) {
    values.push(billingCycle);
    conditions.push(`COALESCE(subscription.billing_cycle, 'monthly') = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM vendors vendor
     LEFT JOIN subscriptions subscription ON subscription.vendor_id = vendor.id
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await client.query(
    `SELECT subscription.id,
            vendor.id AS vendor_id,
            COALESCE(subscription.plan, 'free') AS plan,
            COALESCE(subscription.status, 'trial') AS status,
            COALESCE(subscription.billing_cycle, 'monthly') AS billing_cycle,
            subscription.started_at,
            subscription.expires_at,
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.trial_ends_at,
            subscription.admin_notes,
            COALESCE(subscription.managed_by_admin, FALSE) AS managed_by_admin,
            subscription.created_at,
            subscription.updated_at,
            vendor.legal_name AS vendor_legal_name,
            vendor.display_name AS vendor_display_name,
            vendor.slug AS vendor_slug,
            vendor.status AS vendor_status,
            vendor.contact_email AS vendor_contact_email,
            (
              SELECT COUNT(*)::int
              FROM vendor_customer_relationships relationship
              WHERE relationship.vendor_id = vendor.id
            ) AS customer_count,
            (
              SELECT COUNT(*)::int
              FROM invoices invoice
              WHERE invoice.vendor_id = vendor.id
                AND invoice.created_at >= date_trunc('month', NOW())
                AND invoice.created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
            ) AS invoice_count
     FROM vendors vendor
     LEFT JOIN subscriptions subscription ON subscription.vendor_id = vendor.id
     ${whereClause}
     ORDER BY vendor.created_at DESC, vendor.display_name ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

export {
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
};
