import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import { listInvoices } from "../../services/invoiceApi.js";
import {
  EmptyState,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "../transactions/transactionUtils.js";

const invoiceStatuses = ["draft", "issued", "partially_paid", "paid", "void"];

function InvoiceListScreen({ navigate }) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = useMemo(
    () => ({
      customerId,
      page,
      pageSize: 10,
      search,
      status
    }),
    [customerId, page, search, status]
  );
  const loadInvoices = useCallback((params, options) => listInvoices(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Invoices could not be loaded."),
        title: "Invoices unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading } = useResourceDirectory(loadInvoices, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(customerId || search || status);

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
            onClick={() => navigate("/invoices/new")}
            type="button"
          >
            Create invoice
          </button>
        }
        description="Review issued, partially paid, paid, draft, and void invoices."
        eyebrow="Invoices"
        title="Invoices"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          aria-label="Search invoices"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search invoice number or notes"
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
          {invoiceStatuses.map((statusOption) => (
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

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading invoices...</p> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No invoices match the current filters." : "No invoices found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="resource-table">
          <div className="resource-table-head invoice-grid">
            <span>Invoice</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span>Outstanding</span>
            <span />
          </div>
          {items.map((invoice) => (
            <article className="resource-row invoice-grid" key={invoice.id}>
              <div>
                <strong>{invoice.invoiceNumber}</strong>
                <span>{invoice.issueDate || invoice.createdAt || "No issue date"}</span>
              </div>
              <span>{formatCustomer(invoice.customer)}</span>
              <span className="status-pill">{invoice.status}</span>
              <span>{toMoney(invoice.grandTotal)}</span>
              <span>{toMoney(invoice.balanceDue)}</span>
              <button
                className="secondary-button compact"
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                type="button"
              >
                View
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default InvoiceListScreen;
