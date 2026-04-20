import { useCallback, useEffect, useMemo, useState } from "react";
import { listNotifications } from "../../services/notificationsApi.js";
import {
  EmptyState,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useNotificationsCenter } from "./notificationsContext.js";
import {
  buildNotificationRoute,
  describeRelatedEntity,
  formatAbsoluteTime,
  formatRelativeTime
} from "./notificationUtils.js";

const FILTER_OPTIONS = [
  { value: "", label: "All notifications" },
  { value: "unread", label: "Unread only" }
];

function NotificationsScreen({ navigate }) {
  const { showToast } = useToast();
  const { markAllRead, markRead, recentVersion, unreadCount } = useNotificationsCenter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [actionPendingId, setActionPendingId] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const query = useMemo(
    () => ({
      page,
      pageSize: 20,
      unreadOnly: filter === "unread" ? true : undefined,
      _v: recentVersion
    }),
    [filter, page, recentVersion]
  );

  const loadNotifications = useCallback(
    (params, options) => {
      const { _v: _versionToken, ...rest } = params;
      return listNotifications(rest, options);
    },
    []
  );

  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Notifications could not be loaded."),
        title: "Notifications unavailable",
        tone: "error"
      });
    },
    [showToast]
  );

  const { data, error, isLoading, reload } = useResourceDirectory(loadNotifications, query, {
    onError: handleListError
  });

  const items = data?.items || [];

  useEffect(() => {
    setPage(1);
  }, [filter]);

  async function handleOpen(notification) {
    if (!notification.isRead) {
      setActionPendingId(notification.id);

      try {
        await markRead(notification.id);
      } catch (requestError) {
        showToast({
          message: getApiErrorMessage(
            requestError,
            "We could not mark this notification as read."
          ),
          title: "Action failed",
          tone: "error"
        });
      } finally {
        setActionPendingId(null);
      }
    }

    const route = buildNotificationRoute(notification);

    if (route) {
      navigate(route);
      return;
    }

    if (notification.relatedEntityType) {
      showToast({
        message: `No workspace destination is available for ${describeRelatedEntity(notification)} yet.`,
        title: "No link available",
        tone: "info"
      });
    }

    reload();
  }

  async function handleMarkRead(event, notification) {
    event.stopPropagation();

    if (notification.isRead) {
      return;
    }

    setActionPendingId(notification.id);

    try {
      await markRead(notification.id);
      showToast({
        message: notification.title || "Notification updated.",
        title: "Marked as read",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "We could not mark this notification as read."),
        title: "Action failed",
        tone: "error"
      });
    } finally {
      setActionPendingId(null);
    }
  }

  async function handleMarkAll() {
    if (unreadCount === 0 || isMarkingAll) {
      return;
    }

    setIsMarkingAll(true);

    try {
      const result = await markAllRead();
      showToast({
        message: `${result?.updatedCount || 0} notifications marked as read.`,
        title: "Inbox cleared",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "We could not update your notifications."),
        title: "Action failed",
        tone: "error"
      });
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button
            className="primary-button"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={handleMarkAll}
            type="button"
          >
            {isMarkingAll ? "Updating..." : "Mark all as read"}
          </button>
        }
        description="Review every notification across your workspace and jump to the related record."
        eyebrow="Activity center"
        title="Notifications"
      />

      <Toolbar onSubmit={(event) => event.preventDefault()}>
        <select
          aria-label="Filter notifications"
          onChange={(event) => setFilter(event.target.value)}
          value={filter}
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="surface-message">
          {unreadCount > 0
            ? `${unreadCount} unread across your inbox.`
            : "You're all caught up."}
        </span>
      </Toolbar>

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message">Loading notifications...</p> : null}

      {!isLoading && items.length === 0 ? (
        <EmptyState>
          {filter === "unread"
            ? "No unread notifications right now."
            : "You have no notifications yet."}
        </EmptyState>
      ) : null}

      {items.length > 0 ? (
        <ul className="notification-board">
          {items.map((notification) => {
            const route = buildNotificationRoute(notification);
            const isPending = actionPendingId === notification.id;

            return (
              <li
                className={`notification-board-item${notification.isRead ? "" : " is-unread"}`}
                key={notification.id}
              >
                <button
                  className="notification-board-main"
                  onClick={() => handleOpen(notification)}
                  type="button"
                >
                  <span aria-hidden="true" className="notification-dot" />
                  <span className="notification-board-content">
                    <span className="notification-board-title">{notification.title}</span>
                    {notification.message ? (
                      <span className="notification-board-message">{notification.message}</span>
                    ) : null}
                    <span className="notification-board-meta">
                      <span title={formatAbsoluteTime(notification.createdAt)}>
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                      {notification.type ? (
                        <span className="notification-chip">{notification.type}</span>
                      ) : null}
                      {notification.relatedEntityType ? (
                        <span className="notification-chip">
                          {describeRelatedEntity(notification)}
                        </span>
                      ) : null}
                      {notification.relatedEntityType && !route ? (
                        <span className="notification-chip muted">No link</span>
                      ) : null}
                    </span>
                  </span>
                </button>
                <div className="notification-board-actions">
                  {!notification.isRead ? (
                    <button
                      className="secondary-button compact"
                      disabled={isPending}
                      onClick={(event) => handleMarkRead(event, notification)}
                      type="button"
                    >
                      {isPending ? "..." : "Mark read"}
                    </button>
                  ) : (
                    <span className="notification-read-mark">Read</span>
                  )}
                  {route ? (
                    <button
                      className="secondary-button compact"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpen(notification);
                      }}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default NotificationsScreen;
