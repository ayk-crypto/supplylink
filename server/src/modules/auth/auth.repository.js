import { query, withTransaction } from "../../config/db.js";

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, full_name, email, password_hash, phone, status, last_login_at, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

async function findUserById(userId) {
  const result = await query(
    `SELECT id, full_name, email, phone, status, last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function findVendorById(vendorId) {
  const result = await query(
    `SELECT id, legal_name, display_name, slug, status
     FROM vendors
     WHERE id = $1
     LIMIT 1`,
    [vendorId]
  );

  return result.rows[0] || null;
}

async function countUsersByRoleCode(roleCode) {
  const result = await query(
    `SELECT COUNT(*)::int AS total
     FROM user_roles user_role
     INNER JOIN roles role ON role.id = user_role.role_id
     WHERE role.code = $1`,
    [roleCode]
  );

  return result.rows[0]?.total || 0;
}

async function getRoleByCode(roleCode) {
  const result = await query(
    `SELECT id, code, name, scope, description
     FROM roles
     WHERE code = $1
     LIMIT 1`,
    [roleCode]
  );

  return result.rows[0] || null;
}

async function createVendor({ legalName, displayName, slug, contactEmail }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO vendors (legal_name, display_name, slug, contact_email)
       VALUES ($1, $2, $3, $4)
       RETURNING id, legal_name, display_name, slug, status`,
      [legalName, displayName, slug, contactEmail || null]
    );

    const vendor = result.rows[0];

    await client.query(
      `INSERT INTO subscriptions (
         vendor_id,
         plan,
         status,
         started_at,
         trial_ends_at
       )
       VALUES ($1, 'free', 'trial', NOW(), NOW() + INTERVAL '30 days')
       ON CONFLICT (vendor_id) DO NOTHING`,
      [vendor.id]
    );

    return vendor;
  });
}

async function createUserWithRole({
  user,
  roleId,
  vendorId = null,
  membership = null
}) {
  return withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, status, last_login_at, created_at, updated_at`,
      [user.fullName, user.email, user.passwordHash, user.phone || null, user.status || "active"]
    );

    const createdUser = userResult.rows[0];

    await client.query(
      `INSERT INTO user_roles (user_id, role_id, vendor_id)
       VALUES ($1, $2, $3)`,
      [createdUser.id, roleId, vendorId]
    );

    if (membership) {
      await client.query(
        `INSERT INTO vendor_memberships
          (user_id, vendor_id, status, job_title, invited_by_user_id, joined_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          createdUser.id,
          membership.vendorId,
          membership.status || "active",
          membership.jobTitle || null,
          membership.invitedByUserId || null,
          membership.joinedAt || null
        ]
      );
    }

    return createdUser;
  });
}

async function touchLastLogin(userId) {
  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [userId]);
}

async function getUserRoles(userId) {
  const result = await query(
    `SELECT role.code, role.name, role.scope, user_role.vendor_id
     FROM user_roles user_role
     INNER JOIN roles role ON role.id = user_role.role_id
     WHERE user_role.user_id = $1
     ORDER BY role.code ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    code: row.code,
    name: row.name,
    scope: row.scope,
    vendorId: row.vendor_id
  }));
}

async function getVendorMemberships(userId) {
  const result = await query(
    `SELECT membership.id, membership.vendor_id, membership.status, membership.job_title, membership.joined_at,
            vendor.display_name, vendor.slug
     FROM vendor_memberships membership
     INNER JOIN vendors vendor ON vendor.id = membership.vendor_id
     WHERE membership.user_id = $1
     ORDER BY vendor.display_name ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    vendorId: row.vendor_id,
    status: row.status,
    jobTitle: row.job_title,
    joinedAt: row.joined_at,
    vendorDisplayName: row.display_name,
    vendorSlug: row.slug
  }));
}

export {
  countUsersByRoleCode,
  createUserWithRole,
  createVendor,
  findUserByEmail,
  findUserById,
  findVendorById,
  getRoleByCode,
  getUserRoles,
  getVendorMemberships,
  touchLastLogin
};
