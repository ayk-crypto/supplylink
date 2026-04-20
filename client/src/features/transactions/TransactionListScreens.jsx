import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import { listOrders, listQuotations } from "../../services/transactionApi.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "./transactionUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";

const configs = {
  orders: {
    createPath: "/orders/new",
    description: "Track customer orders from draft through fulfillment.",
    empty: "No orders found.",
    filteredEmpty: "No orders match the current filters.",
    list: listOrders,
    numberKey: "orderNumber",
    title: "Orders",
    toastTitle: "Orders unavailable",
    statuses: ["draft", "confirmed", "packed", "dispatched", "delivered", "cancelled"]
  },
  quotations: {
    createPath: "/quotations/new",
    description: "Prepare customer quotations with product lines and server-calculated totals.",
    empty: "No quotations found.",
    filteredEmpty: "No quotations match the current filters.",
    list: listQuotations,
    numberKey: "quoteNumber",
    title: "Quotations",
    toastTitle: "Quotations unavailable",
    statuses: ["draft", "sent", "accepted", "rejected", "expired"]
  }
};

function TransactionListScreen({ kind, navigate }) {
  const config = configs[kind];
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useMemo(
    () => ({
      page,
      pageSize,
      customerId,
      search,
      status
    }),
    [customerId, page, pageSize, search, status]
  );
  const loadDirectory = useCallback((params, options) => config.list(params, options), [config]);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, `${config.title} could not be loaded.`),
        title: config.toastTitle,
        tone: "error"
      });
    },
    [config, showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadDirectory, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(search || status || customerId);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCustomerFilter() {
      try {
        const response = await listCustomers(
          { page: 1, pageSize: 100, status: "active" },
          { signal: controller.signal }
        );

        if (active) {
          setCustomers(
            (response.data.items || []).map((record) => ({
              id: record.customer.id,
              label: record.customer.companyName || record.customer.fullName
            }))
          );
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        showToast({
          message: getApiErrorMessage(requestError, "Customer filter could not be loaded."),
          title: "Customer filter unavailable",
          tone: "error"
        });
      }
    }

    loadCustomerFilter();

    return () => {
      active = false;
      controller.abort();
    };
  }, [showToast]);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button
            className="primary-button"
            onClick={() => navigate(config.createPath)}
            type="button"
          >
            New {kind === "orders" ? "order" : "quotation"}
          </button>
        }
        description={config.description}
        eyebrow={config.title}
        title={config.title}
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          aria-label={`Search ${kind}`}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder={`Search ${kind}`}
          type="search"
          value={searchDraft}
        />
        <select
          aria-label="Filter by customer"
          onChange={(event) => {
            setCustomerId(event.target.value);
            setPage(1);
          }}
          value={customerId}
        >
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {config.statuses.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption.replace("_", " ")}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
        {hasFilters ? (
          <button
            className="secondary-button"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setCustomerId("");
              setStatus("");
              setPage(1);
            }}
            type="button"
          >
            Reset
          </button>
        ) : null}
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading ? <LoadingState>Loading {kind}…</LoadingState> : null}
      {!isLoading && !items.length ? (
        <EmptyState>{hasFilters ? config.filteredEmpty : config.empty}</EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
        <div className="resource-table">
          <div className="resource-table-head transaction-grid">
            <span>Number</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span />
          </div>
          {items.map((item) => (
            <article className="resource-row transaction-grid" key={item.id}>
              <div>
                <strong>{item[config.numberKey]}</strong>
                <span>{item.orderDate || item.issueDate || item.createdAt || "No date"}</span>
              </div>
              <span>{formatCustomer(item.customer)}</span>
              <span className="status-pill">{item.status}</span>
              <span>{toMoney(item.grandTotal)}</span>
              <button
                className="secondary-button compact"
                onClick={() => navigate(`/${kind}/${item.id}`)}
                type="button"
              >
                View
              </button>
            </article>
          ))}
        </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default TransactionListScreen;
