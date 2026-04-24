import { query } from "../../config/db.js";

const SUBSCRIPTION_SELECT = `subscription.id,
                             subscription.vendor_id,
                             subscription.plan,
                             subscription.status,
                             subscription.started_at,
                             subscription.expires_at,
                             subscription.trial_ends_at,
                             subscription.created_at,
                             subscription.updated_at,
                             vendor.legal_name AS vendor_legal_name,
                             vendor.display_name AS vendor_display_name,
                             vendor.slug AS vendor_slug,
                             vendor.status AS vendor_status,
                             vendor.contact_email AS vendor_contact_email`;

const SUBSCRIPTION_RETURNING = `id,
                                vendor_id,
                                plan,
                                status,
                                started_at,
                                expires_at,
                                trial_ends_at,
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
       started_at,
       expires_at,
       trial_ends_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SUBSCRIPTION_RETURNING}`,
    [
      payload.vendor_id,
      payload.plan,
      payload.status,
      payload.started_at || null,
      payload.expires_at || null,
      payload.trial_ends_at || null
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

export {
  countCustomersForVendor,
  countInvoicesForVendorCurrentMonth,
  createSubscription,
  findSubscriptionByVendorId,
  findVendorById,
  updateSubscriptionByVendorId
};
