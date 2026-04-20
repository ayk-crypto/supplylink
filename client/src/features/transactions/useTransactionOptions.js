import { useEffect, useState } from "react";
import { listCustomers, listProducts } from "../../services/masterDataApi.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";

function mapCustomerOption(record) {
  return {
    id: record.customer.id,
    label: record.customer.companyName || record.customer.fullName,
    secondaryText: record.customer.email || record.customer.phone || null
  };
}

function useTransactionOptions(onError) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadOptions() {
      setIsLoading(true);
      setError("");

      try {
        const [customerResponse, productResponse] = await Promise.all([
          listCustomers({ page: 1, pageSize: 100, status: "active" }, { signal: controller.signal }),
          listProducts({ page: 1, pageSize: 100, status: "active" }, { signal: controller.signal })
        ]);

        if (!active) {
          return;
        }

        setCustomers((customerResponse.data.items || []).map(mapCustomerOption));
        setProducts(productResponse.data.items || []);
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = getApiErrorMessage(requestError, "Customers and products could not load.");

        setError(message);
        onError?.(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [onError]);

  return {
    customers,
    error,
    isLoading,
    products
  };
}

export { useTransactionOptions };
