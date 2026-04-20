import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth.js";
import {
  bulkReadNotifications,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../../services/notificationsApi.js";
import { NotificationsCenterContext } from "./notificationsContext.js";

const POLL_INTERVAL_MS = 60000;
const RECENT_LIMIT = 8;

function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState("");
  const [recentVersion, setRecentVersion] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshUnreadCount = useCallback(
    async (options = {}) => {
      if (!isAuthenticated) {
        return 0;
      }

      try {
        const response = await getUnreadCount(options);
        const nextCount = response?.data?.unreadCount || 0;

        if (isMountedRef.current) {
          setUnreadCount(nextCount);
        }

        return nextCount;
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return unreadCount;
        }

        return unreadCount;
      }
    },
    [isAuthenticated, unreadCount]
  );

  const refreshRecent = useCallback(
    async (options = {}) => {
      if (!isAuthenticated) {
        return [];
      }

      if (isMountedRef.current) {
        setIsLoadingRecent(true);
        setRecentError("");
      }

      try {
        const response = await listNotifications(
          { page: 1, pageSize: RECENT_LIMIT },
          options
        );
        const items = response?.data?.items || [];

        if (isMountedRef.current) {
          setRecent(items);
        }

        return items;
      } catch (requestError) {
        if (requestError?.name === "AbortError") {
          return [];
        }

        if (isMountedRef.current) {
          setRecentError(
            requestError instanceof Error
              ? requestError.message
              : "Recent notifications could not be loaded."
          );
        }

        return [];
      } finally {
        if (isMountedRef.current) {
          setIsLoadingRecent(false);
        }
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      setRecent([]);
      setRecentError("");
      return undefined;
    }

    const controller = new AbortController();
    refreshUnreadCount({ signal: controller.signal });

    const intervalId = window.setInterval(() => {
      refreshUnreadCount();
    }, POLL_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  const markRead = useCallback(
    async (notificationId) => {
      const target = recent.find((item) => item.id === notificationId);

      if (target && !target.isRead) {
        setRecent((current) =>
          current.map((item) =>
            item.id === notificationId
              ? { ...item, isRead: true, status: "read", readAt: new Date().toISOString() }
              : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }

      try {
        const response = await markNotificationRead(notificationId);
        const updated = response?.data;

        if (updated) {
          setRecent((current) =>
            current.map((item) => (item.id === updated.id ? updated : item))
          );
        }

        await refreshUnreadCount();
        setRecentVersion((value) => value + 1);
        return updated;
      } catch (requestError) {
        await refreshUnreadCount();
        await refreshRecent();
        throw requestError;
      }
    },
    [recent, refreshRecent, refreshUnreadCount]
  );

  const markManyRead = useCallback(
    async (notificationIds) => {
      const ids = Array.from(new Set(notificationIds || [])).filter(Boolean);

      if (!ids.length) {
        return { requestedCount: 0, updatedCount: 0, skippedCount: 0, updatedIds: [] };
      }

      const idSet = new Set(ids);
      setRecent((current) =>
        current.map((item) =>
          idSet.has(item.id) && !item.isRead
            ? { ...item, isRead: true, status: "read", readAt: new Date().toISOString() }
            : item
        )
      );

      try {
        const response = await bulkReadNotifications(ids);
        const summary = response?.data || { updatedCount: 0, skippedCount: 0, requestedCount: ids.length, updatedIds: [] };

        await refreshUnreadCount();
        setRecentVersion((value) => value + 1);
        return summary;
      } catch (requestError) {
        await refreshUnreadCount();
        await refreshRecent();
        throw requestError;
      }
    },
    [refreshRecent, refreshUnreadCount]
  );

  const markAllRead = useCallback(async () => {
    setRecent((current) =>
      current.map((item) =>
        item.isRead
          ? item
          : { ...item, isRead: true, status: "read", readAt: new Date().toISOString() }
      )
    );
    setUnreadCount(0);

    try {
      const response = await markAllNotificationsRead();
      await refreshUnreadCount();
      setRecentVersion((value) => value + 1);
      return response?.data;
    } catch (requestError) {
      await refreshUnreadCount();
      await refreshRecent();
      throw requestError;
    }
  }, [refreshRecent, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoadingRecent,
      markAllRead,
      markManyRead,
      markRead,
      recent,
      recentError,
      recentVersion,
      refreshRecent,
      refreshUnreadCount,
      unreadCount
    }),
    [
      isAuthenticated,
      isLoadingRecent,
      markAllRead,
      markManyRead,
      markRead,
      recent,
      recentError,
      recentVersion,
      refreshRecent,
      refreshUnreadCount,
      unreadCount
    ]
  );

  return (
    <NotificationsCenterContext.Provider value={value}>
      {children}
    </NotificationsCenterContext.Provider>
  );
}

export default NotificationsProvider;
