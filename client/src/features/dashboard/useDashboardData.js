import { useEffect, useState } from "react";
import { getDashboard, getNotificationsPanel } from "../../services/dashboardApi.js";
import { listInventoryProducts } from "../../services/inventoryApi.js";
import { listOrders } from "../../services/transactionApi.js";
import { listInvoices } from "../../services/invoiceApi.js";

const ORDER_STATUS_KEYS = ["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"];
const INVOICE_STATUS_KEYS = ["draft", "issued", "partially_paid", "paid", "void"];
const LOW_STOCK_THRESHOLD = 5;
const INVENTORY_SNAPSHOT_PAGE_SIZE = 100;

function summarizeInventoryItems(items) {
  let lowStock = 0;
  let negative = 0;

  for (const item of items) {
    const quantity = Number(item.stockQuantity);
    if (Number.isNaN(quantity)) {
      continue;
    }

    if (quantity < 0) {
      negative += 1;
    } else if (quantity <= LOW_STOCK_THRESHOLD) {
      lowStock += 1;
    }
  }

  return { lowStock, negative };
}

async function fetchStatusCounts(listFn, statusKeys, signal) {
  const requests = statusKeys.map((status) =>
    listFn({ status, page: 1, pageSize: 1 }, { signal })
      .then((response) => [status, Number(response?.data?.pagination?.total || 0)])
      .catch((requestError) => {
        if (requestError?.name === "AbortError") {
          throw requestError;
        }
        return [status, null];
      })
  );

  const settled = await Promise.all(requests);
  return Object.fromEntries(settled);
}

async function fetchInventorySnapshot(signal) {
  const response = await listInventoryProducts(
    { page: 1, pageSize: INVENTORY_SNAPSHOT_PAGE_SIZE },
    { signal }
  );
  const items = response?.data?.items || [];
  const total = Number(response?.data?.pagination?.total || items.length);
  const summary = summarizeInventoryItems(items);

  return {
    total,
    lowStock: summary.lowStock,
    negative: summary.negative,
    sampledCount: items.length,
    isPartial: total > items.length
  };
}

function useDashboardData() {
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [error, setError] = useState("");
  const [notificationsError, setNotificationsError] = useState("");
  const [intelligenceError, setIntelligenceError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [areNotificationsLoading, setAreNotificationsLoading] = useState(true);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(true);

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

    async function loadIntelligence() {
      setIsIntelligenceLoading(true);
      setIntelligenceError("");

      try {
        const [inventoryResult, orderCounts, invoiceCounts] = await Promise.all([
          fetchInventorySnapshot(controller.signal),
          fetchStatusCounts(listOrders, ORDER_STATUS_KEYS, controller.signal),
          fetchStatusCounts(listInvoices, INVOICE_STATUS_KEYS, controller.signal)
        ]);

        if (!active) {
          return;
        }

        setIntelligence({
          inventory: inventoryResult,
          orderCounts,
          invoiceCounts
        });
        setIntelligenceError("");
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setIntelligenceError(
          requestError instanceof Error
            ? requestError.message
            : "Operational metrics could not load."
        );
      } finally {
        if (active) {
          setIsIntelligenceLoading(false);
        }
      }
    }

    loadDashboard();
    loadNotifications();
    loadIntelligence();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return {
    areNotificationsLoading,
    dashboard,
    error,
    intelligence,
    intelligenceError,
    isIntelligenceLoading,
    isLoading,
    notifications,
    notificationsError
  };
}

export { INVOICE_STATUS_KEYS, ORDER_STATUS_KEYS, useDashboardData };
