import { query } from "../../config/db.js";

const NOTIFICATION_SELECT = `notification.id,
                             notification.vendor_id,
                             notification.user_id,
                             notification.type,
                             notification.event_code,
                             notification.title,
                             notification.message,
                             notification.related_entity_type,
                             notification.related_entity_id,
                             notification.status,
                             notification.metadata,
                             notification.read_at,
                             notification.created_at,
                             notification.updated_at,
                             vendor.display_name AS vendor_display_name,
                             vendor.slug AS vendor_slug`;

function notificationJoinClause() {
  return `FROM notifications notification
          LEFT JOIN vendors vendor ON vendor.id = notification.vendor_id`;
}

async function listNotificationsForUser({
  userId,
  unreadOnly = false,
  type = null,
  eventCode = null,
  dateFrom = null,
  dateTo = null,
  limit = 20,
  offset = 0
}) {
  const conditions = ["notification.user_id = $1"];
  const values = [userId];

  if (unreadOnly) {
    conditions.push("notification.status = 'unread'");
  }

  if (type) {
    values.push(type);
    conditions.push(`notification.type = $${values.length}`);
  }

  if (eventCode) {
    values.push(eventCode);
    conditions.push(`notification.event_code = $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`notification.created_at::date >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`notification.created_at::date <= $${values.length}`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     ${notificationJoinClause()}
     ${whereClause}`,
    values
  );

  values.push(limit);
  values.push(offset);

  const result = await query(
    `SELECT ${NOTIFICATION_SELECT}
     ${notificationJoinClause()}
     ${whereClause}
     ORDER BY notification.created_at DESC, notification.id DESC
     LIMIT $${values.length - 1}
     OFFSET $${values.length}`,
    values
  );

  return {
    rows: result.rows,
    total: countResult.rows[0]?.total || 0
  };
}

async function countUnreadNotificationsForUser(userId) {
  const result = await query(
    `SELECT COUNT(*)::int AS total
     FROM notifications
     WHERE user_id = $1
       AND status = 'unread'`,
    [userId]
  );

  return result.rows[0]?.total || 0;
}

async function listLatestNotificationsForUser(userId, limit = 10) {
  const result = await query(
    `SELECT ${NOTIFICATION_SELECT}
     ${notificationJoinClause()}
     WHERE notification.user_id = $1
     ORDER BY notification.created_at DESC, notification.id DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

async function findNotificationForUser(userId, notificationId) {
  const result = await query(
    `SELECT ${NOTIFICATION_SELECT}
     ${notificationJoinClause()}
     WHERE notification.user_id = $1
       AND notification.id = $2
     LIMIT 1`,
    [userId, notificationId]
  );

  return result.rows[0] || null;
}

async function markNotificationReadForUser(userId, notificationId) {
  const result = await query(
    `UPDATE notifications notification
     SET status = 'read',
         read_at = COALESCE(notification.read_at, NOW()),
         updated_at = NOW()
     WHERE notification.user_id = $1
       AND notification.id = $2
     RETURNING id`,
    [userId, notificationId]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findNotificationForUser(userId, notificationId);
}

async function markAllNotificationsReadForUser(userId) {
  const result = await query(
    `UPDATE notifications
     SET status = 'read',
         read_at = COALESCE(read_at, NOW()),
         updated_at = NOW()
     WHERE user_id = $1
       AND status = 'unread'
     RETURNING id`,
    [userId]
  );

  return result.rowCount || 0;
}

async function listActiveVendorUsersByRoleCodes(vendorId, roleCodes) {
  if (roleCodes.length === 0) {
    return [];
  }

  const result = await query(
    `SELECT DISTINCT users.id
     FROM users
     INNER JOIN vendor_memberships membership
       ON membership.user_id = users.id
      AND membership.vendor_id = $1
      AND membership.status = 'active'
     INNER JOIN user_roles user_role
       ON user_role.user_id = users.id
      AND user_role.vendor_id = $1
     INNER JOIN roles role ON role.id = user_role.role_id
     WHERE users.status = 'active'
       AND role.code = ANY($2::text[])`,
    [vendorId, roleCodes]
  );

  return result.rows.map((row) => row.id);
}

async function listActiveSuperAdminUserIds() {
  const result = await query(
    `SELECT DISTINCT users.id
     FROM users
     INNER JOIN user_roles user_role ON user_role.user_id = users.id
     INNER JOIN roles role ON role.id = user_role.role_id
     WHERE users.status = 'active'
       AND role.code = 'super_admin'`
  );

  return result.rows.map((row) => row.id);
}

async function createNotificationsForUsers({
  userIds,
  vendorId = null,
  type = "business",
  eventCode,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
  metadata = {}
}) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const values = [];
  const placeholders = uniqueUserIds.map((userId, index) => {
    const offset = index * 9;
    values.push(
      vendorId,
      userId,
      type,
      eventCode,
      title,
      message,
      relatedEntityType,
      relatedEntityId,
      metadata
    );

    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
  });

  const result = await query(
    `INSERT INTO notifications (
       vendor_id,
       user_id,
       type,
       event_code,
       title,
       message,
       related_entity_type,
       related_entity_id,
       metadata
     )
     VALUES ${placeholders.join(", ")}
     RETURNING id`,
    values
  );

  return result.rows;
}

export {
  countUnreadNotificationsForUser,
  createNotificationsForUsers,
  findNotificationForUser,
  listActiveSuperAdminUserIds,
  listActiveVendorUsersByRoleCodes,
  listLatestNotificationsForUser,
  listNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser
};
