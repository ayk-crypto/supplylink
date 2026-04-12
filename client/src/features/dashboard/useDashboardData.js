import { useEffect, useState } from "react";
import { getDashboard, getNotificationsPanel } from "../../services/dashboardApi.js";

function useDashboardData() {
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);

      try {
        const [dashboardResponse, notificationsResponse] = await Promise.all([
          getDashboard(),
          getNotificationsPanel()
        ]);

        if (!active) {
          return;
        }

        setDashboard(dashboardResponse.data);
        setNotifications(notificationsResponse.data);
        setError("");
      } catch (requestError) {
        if (!active) {
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

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  return {
    dashboard,
    error,
    isLoading,
    notifications
  };
}

export { useDashboardData };
