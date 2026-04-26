import { useEffect, useState } from "react";
import { getDashboard, getNotificationsPanel } from "../../services/dashboardApi.js";
import { getSubscription } from "../../services/subscriptionApi.js";

function useDashboardData() {
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [areNotificationsLoading, setAreNotificationsLoading] = useState(true);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);

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
        if (!active) {
          return;
        }

        if (requestError.name === "AbortError") {
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
        if (!active) {
          return;
        }

        if (requestError.name === "AbortError") {
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

    async function loadSubscription() {
      setIsSubscriptionLoading(true);

      try {
        const subscriptionResponse = await getSubscription({ signal: controller.signal });

        if (!active) {
          return;
        }

        setSubscription(subscriptionResponse.data);
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setSubscription(null);
      } finally {
        if (active) {
          setIsSubscriptionLoading(false);
        }
      }
    }

    loadDashboard();
    loadNotifications();
    loadSubscription();

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
    isSubscriptionLoading,
    notifications,
    notificationsError,
    subscription
  };
}

export { useDashboardData };
