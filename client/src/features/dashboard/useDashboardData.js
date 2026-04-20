import { useEffect, useState } from "react";
import { getDashboard, getNotificationsPanel } from "../../services/dashboardApi.js";

const ORDER_STATUS_KEYS = ["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
const INVOICE_STATUS_KEYS = ["draft", "issued", "partially_paid", "paid", "void"];

function useDashboardData() {
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [areNotificationsLoading, setAreNotificationsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const dashboardResponse = await getDashboard({
          includeNotifications: false,
          signal: controller.signal
        });

        if (!active) {
          return;
        }

        setDashboard(dashboardResponse.data);
        setError("");
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setError(
          requestError instanceof Error ? requestError.message : "Dashboard data could not load."
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    async function loadNotifications() {
      setAreNotificationsLoading(true);
      setNotificationsError("");

      try {
        const notificationsResponse = await getNotificationsPanel({ signal: controller.signal });

        if (!active) {
          return;
        }

        setNotifications(notificationsResponse.data);
        setNotificationsError("");
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setNotificationsError(
          requestError instanceof Error ? requestError.message : "Notifications could not load."
        );
      } finally {
        if (active) {
          setAreNotificationsLoading(false);
        }
      }
    }

    loadDashboard();
    loadNotifications();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return {
    areNotificationsLoading,
    dashboard,
    error,
    isLoading,
    notifications,
    notificationsError
  };
}

export { INVOICE_STATUS_KEYS, ORDER_STATUS_KEYS, useDashboardData };
