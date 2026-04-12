import AppError from "../../core/errors/AppError.js";
import {
  countUnreadNotificationsForUser,
  createNotificationsForUsers,
  findNotificationForUser,
  listActiveSuperAdminUserIds,
  listActiveVendorUsersByRoleCodes,
  listLatestNotificationsForUser,
  listNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser
} from "./notifications.repository.js";

function mapNotification(row) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    userId: row.user_id,
    type: row.type,
    eventCode: row.event_code,
    title: row.title,
    message: row.message,
    status: row.status,
    isRead: row.status === "read",
    metadata: row.metadata || {},
    vendor: row.vendor_id
      ? {
          id: row.vendor_id,
          displayName: row.vendor_display_name,
          slug: row.vendor_slug
        }
      : null,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertNotificationFound(row, notificationId) {
  if (!row) {
    throw new AppError("Notification not found", {
      statusCode: 404,
      code: "NOTIFICATION_NOT_FOUND",
      details: [
        {
          path: "notificationId",
          message: `No notification was found for ${notificationId}`
        }
      ]
    });
  }
}

async function getNotificationDirectory(userId, query) {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;
  const result = await listNotificationsForUser({
    userId,
    unreadOnly: query.unreadOnly || false,
    type: query.type || null,
    eventCode: query.eventCode || null,
    dateFrom: query.dateFrom || null,
    dateTo: query.dateTo || null,
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    items: result.rows.map(mapNotification),
    pagination: {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / pageSize)
    },
    filters: {
      unreadOnly: query.unreadOnly || false,
      type: query.type || null,
      eventCode: query.eventCode || null,
      dateFrom: query.dateFrom || null,
      dateTo: query.dateTo || null
    }
  };
}

async function getUnreadNotificationCount(userId) {
  return {
    unreadCount: await countUnreadNotificationsForUser(userId)
  };
}

async function getNotificationPanelSummary(userId, { limit = 10 } = {}) {
  const [latest, unreadCount] = await Promise.all([
    listLatestNotificationsForUser(userId, limit),
    countUnreadNotificationsForUser(userId)
  ]);

  return {
    unreadCount,
    latest: latest.map(mapNotification),
    limit
  };
}

async function getNotificationDetail(userId, notificationId) {
  const notification = await findNotificationForUser(userId, notificationId);

  assertNotificationFound(notification, notificationId);

  return mapNotification(notification);
}

async function markNotificationRead(userId, notificationId) {
  const notification = await markNotificationReadForUser(userId, notificationId);

  assertNotificationFound(notification, notificationId);

  return mapNotification(notification);
}

async function markAllNotificationsRead(userId) {
  return {
    updatedCount: await markAllNotificationsReadForUser(userId),
    unreadCount: 0
  };
}

async function notifyVendorUsers({
  vendorId,
  roleCodes = ["vendor_admin"],
  type = "business",
  eventCode,
  title,
  message,
  metadata = {}
}) {
  const userIds = await listActiveVendorUsersByRoleCodes(vendorId, roleCodes);

  return createNotificationsForUsers({
    userIds,
    vendorId,
    type,
    eventCode,
    title,
    message,
    metadata
  });
}

async function notifySuperAdmins({
  type = "platform",
  eventCode,
  title,
  message,
  metadata = {}
}) {
  const userIds = await listActiveSuperAdminUserIds();

  return createNotificationsForUsers({
    userIds,
    vendorId: null,
    type,
    eventCode,
    title,
    message,
    metadata
  });
}

function runNotificationTask(task) {
  task.catch((error) => {
    console.error("Notification task failed", error);
  });
}

export {
  getNotificationDetail,
  getNotificationDirectory,
  getNotificationPanelSummary,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notifySuperAdmins,
  notifyVendorUsers,
  runNotificationTask
};
