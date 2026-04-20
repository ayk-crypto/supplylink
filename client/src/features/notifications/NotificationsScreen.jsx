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
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isMarkingSelected, setIsMarkingSelected] = useState(false);

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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, filter, recentVersion]);

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleMarkSelected() {
    if (isMarkingSelected) {
      return;
    }
    const targets = items.filter(
      (item) => selectedIds.has(item.id) && !item.isRead
    );
    if (!targets.length) {
      return;
    }
    setIsMarkingSelected(true);
    let successCount = 0;
    let failureCount = 0;
    for (const target of targets) {
      try {
        await markRead(target.id);
        successCount += 1;
      } catch {
        failureCount += 1;
      }
    }
    setIsMarkingSelected(false);
    setSelectedIds(new Set());
    if (successCount > 0) {
      showToast({
        message: `${successCount} marked as read${failureCount ? `, ${failureCount} failed` : ""}.`,
        title: "Selection updated",
        tone: failureCount > 0 ? "info" : "success"
      });
    } else if (failureCount > 0) {
      showToast({
        message: "We could not update the selected notifications.",
        title: "Action failed",
        tone: "error"
      });
    }
  }

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

      {selectedIds.size > 0 ? (
        <div aria-live="polite" className="bulk-action-bar">
          <span>{selectedIds.size} selected</span>
          <div className="button-row">
            <button
              className="primary-button"
              disabled={isMarkingSelected}
              onClick={handleMarkSelected}
              type="button"
            >
              {isMarkingSelected ? "Updating..." : "Mark selected as read"}
            </button>
            <button
              className="secondary-button"
              disabled={isMarkingSelected}
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading notifications...</p> : null}

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
                    <label className="bulk-checkbox" title="Select to bulk-mark">
                      <input
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelected(notification.id)}
                        onClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                      <span className="visually-hidden">Select notification</span>
                    </label>
                  ) : null}
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
