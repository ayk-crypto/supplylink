import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useToast } from "../feedback/toastContext.js";
import { useNotificationsCenter } from "./notificationsContext.js";
import {
  buildNotificationRoute,
  describeRelatedEntity,
  formatRelativeTime
} from "./notificationUtils.js";

function NotificationBell({ onNavigate }) {
  const {
    isLoadingRecent,
    markAllRead,
    markRead,
    recent,
    recentError,
    refreshRecent,
    unreadCount
  } = useNotificationsCenter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const containerRef = useRef(null);
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    refreshRecent();

    function handleDocumentClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, refreshRecent]);

  function toggleOpen() {
    setIsOpen((current) => !current);
  }

  async function handleNotificationClick(notification) {
    setIsOpen(false);

    if (!notification.isRead) {
      try {
        await markRead(notification.id);
      } catch (requestError) {
        showToast({
          message: getApiErrorMessage(requestError, "We could not mark this notification as read."),
          title: "Action failed",
          tone: "error"
        });
      }
    }

    const targetPath = buildNotificationRoute(notification);

    if (targetPath) {
      onNavigate?.(targetPath);
      return;
    }

    if (notification.relatedEntityType) {
      showToast({
        message: `No workspace destination is available for ${describeRelatedEntity(notification)} yet.`,
        title: "Opened in activity center",
        tone: "info"
      });
    }

    onNavigate?.("/notifications");
  }

  async function handleMarkAll() {
    if (unreadCount === 0 || isBusy) {
      return;
    }

    setIsBusy(true);

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
      setIsBusy(false);
    }
  }

  function handleViewAll() {
    setIsOpen(false);
    onNavigate?.("/notifications");
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        className={`notification-bell-trigger${isOpen ? " is-open" : ""}`}
        onClick={toggleOpen}
        type="button"
      >
        <span aria-hidden="true" className="notification-bell-icon">
          <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
            <path
              d="M6 8a6 6 0 1 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
            <path
              d="M10 18a2 2 0 0 0 4 0"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.6"
            />
          </svg>
        </span>
        {unreadCount > 0 ? (
          <span aria-hidden="true" className="notification-bell-badge">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="dialog" aria-label="Recent notifications">
          <header className="notification-panel-head">
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</small>
            </div>
            <button
              className="link-button"
              disabled={unreadCount === 0 || isBusy}
              onClick={handleMarkAll}
              type="button"
            >
              Mark all as read
            </button>
          </header>

          <div className="notification-panel-body">
            {recentError ? (
              <p className="surface-message error">{recentError}</p>
            ) : null}

            {isLoadingRecent && recent.length === 0 ? (
              <p className="surface-message loading">Loading notifications...</p>
            ) : null}

            {!isLoadingRecent && recent.length === 0 && !recentError ? (
              <p className="empty-panel">You have no notifications yet.</p>
            ) : null}

            {recent.length > 0 ? (
              <ul className="notification-list">
                {recent.map((notification) => {
                  const route = buildNotificationRoute(notification);

                  return (
                    <li
                      className={`notification-item${notification.isRead ? "" : " is-unread"}`}
                      key={notification.id}
                    >
                      <button
                        className="notification-item-button"
                        onClick={() => handleNotificationClick(notification)}
                        type="button"
                      >
                        <span aria-hidden="true" className="notification-dot" />
                        <span className="notification-item-content">
                          <span className="notification-item-title">{notification.title}</span>
                          {notification.message ? (
                            <span className="notification-item-message">
                              {notification.message}
                            </span>
                          ) : null}
                          <span className="notification-item-meta">
                            <span>{formatRelativeTime(notification.createdAt)}</span>
                            {notification.relatedEntityType ? (
                              <span className="notification-chip">
                                {describeRelatedEntity(notification)}
                              </span>
                            ) : null}
                            {!route && notification.relatedEntityType ? (
                              <span className="notification-chip muted">No link</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <footer className="notification-panel-foot">
            <button className="link-button" onClick={handleViewAll} type="button">
              View all notifications
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
