import { query } from "../../config/db.js";

async function findVendorById(vendorId) {
  const result = await query(
    `SELECT id,
            legal_name,
            display_name,
            slug,
            status,
            contact_email,
            contact_phone,
            currency_code,
            timezone,
            created_at,
            updated_at
     FROM vendors
     WHERE id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function findVendorBySlug(slug) {
  const result = await query(
    `SELECT id,
            legal_name,
            display_name,
            slug,
            status,
            contact_email,
            contact_phone,
            currency_code,
            timezone,
            created_at,
            updated_at
     FROM vendors
     WHERE slug = $1
     LIMIT 1`,
    [slug]
  );

  return result.rows[0] || null;
}

async function listVendors({ search = null, status = null, limit = 20, offset = 0 }) {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`vendors.status = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(
      vendors.legal_name ILIKE $${values.length}
      OR vendors.display_name ILIKE $${values.length}
      OR vendors.slug ILIKE $${values.length}
      OR COALESCE(vendors.contact_email, '') ILIKE $${values.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM vendors ${whereClause}`, values);

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT vendors.id,
            vendors.legal_name,
            vendors.display_name,
            vendors.slug,
            vendors.status,
            vendors.contact_email,
            vendors.contact_phone,
            vendors.currency_code,
            vendors.timezone,
            vendors.created_at,
            vendors.updated_at,
            subscription.plan AS subscription_plan,
            subscription.status AS subscription_status,
            admin_user.id AS admin_user_id,
            admin_user.full_name AS admin_full_name,
            admin_user.email AS admin_email
     FROM vendors
     LEFT JOIN subscriptions subscription ON subscription.vendor_id = vendors.id
     LEFT JOIN LATERAL (
       SELECT "user".id,
              "user".full_name,
              "user".email
       FROM vendor_memberships membership
       INNER JOIN users "user" ON "user".id = membership.user_id
       INNER JOIN user_roles user_role
         ON user_role.user_id = "user".id
        AND user_role.vendor_id = membership.vendor_id
       INNER JOIN roles role ON role.id = user_role.role_id
       WHERE membership.vendor_id = vendors.id
         AND membership.status = 'active'
         AND role.code = 'vendor_admin'
       ORDER BY membership.joined_at ASC NULLS LAST,
                membership.created_at ASC,
                "user".created_at ASC
       LIMIT 1
     ) admin_user ON TRUE
     ${whereClause}
     ORDER BY vendors.created_at DESC, vendors.display_name ASC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function updateVendorById(vendorId, updates) {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return findVendorById(vendorId);
  }

  const values = [];
  const setClauses = entries.map(([column, value], index) => {
    values.push(value);
    return `${column} = $${index + 1}`;
  });

  values.push(vendorId);

  const result = await query(
    `UPDATE vendors
     SET ${setClauses.join(", ")},
         updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id,
               legal_name,
               display_name,
               slug,
               status,
               contact_email,
               contact_phone,
               currency_code,
               timezone,
               created_at,
               updated_at`,
    values
  );

  return result.rows[0] || null;
}

async function listVendorMembers(vendorId) {
  const result = await query(
    `SELECT membership.id,
            membership.user_id,
            membership.status AS membership_status,
            membership.joined_at,
            membership.created_at,
            "user".full_name,
            "user".email,
            COALESCE(
              ARRAY_REMOVE(ARRAY_AGG(DISTINCT role.code::text) FILTER (WHERE role.code IS NOT NULL), NULL),
              '{}'::text[]
            ) AS role_codes
     FROM vendor_memberships membership
     INNER JOIN users "user" ON "user".id = membership.user_id
     LEFT JOIN user_roles user_role
       ON user_role.user_id = membership.user_id
      AND user_role.vendor_id = membership.vendor_id
     LEFT JOIN roles role ON role.id = user_role.role_id
     WHERE membership.vendor_id = $1
     GROUP BY membership.id,
              membership.user_id,
              membership.status,
              membership.joined_at,
              membership.created_at,
              "user".full_name,
              "user".email
     ORDER BY "user".full_name ASC, "user".email ASC`,
    [vendorId]
  );

  return result.rows;
}

export { findVendorById, findVendorBySlug, listVendorMembers, listVendors, updateVendorById };
