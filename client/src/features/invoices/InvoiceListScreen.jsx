import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import { listInvoices } from "../../services/invoiceApi.js";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentBadge from "../attachments/AttachmentBadge.jsx";
import { useAttachmentCounts } from "../attachments/useAttachmentCounts.js";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "../transactions/transactionUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateWith, getDefaultPageSize } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";

const invoiceStatuses = ["draft", "issued", "partially_paid", "paid", "void"];

function InvoiceListScreen({ navigate }) {
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
      customerId,
      page,
      pageSize,
      search,
      status
    }),
    [customerId, page, pageSize, search, status]
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
  const { data, error, isLoading, reload } = useResourceDirectory(loadInvoices, query, {
    onError: handleListError
  });
  const items = useMemo(() => data?.items || [], [data]);
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const attachmentCounts = useAttachmentCounts("invoices", itemIds);
  const hasFilters = Boolean(customerId || search || status);

  const todayIso = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const isOverdue = (invoice) => {
    if (!invoice.dueDate) return false;
    const dueDateOnly = String(invoice.dueDate).slice(0, 10);
    return (
      dueDateOnly < todayIso &&
      invoice.status !== "paid" &&
      invoice.status !== "void" &&
      Number(invoice.balanceDue || 0) > 0
    );
  };

  const pageSummary = useMemo(() => {
    let outstanding = 0;
    let overdueCount = 0;
    let paidCount = 0;
    items.forEach((invoice) => {
      outstanding += Number(invoice.balanceDue || 0);
      if (invoice.status === "paid") paidCount += 1;
      if (isOverdue(invoice)) overdueCount += 1;
    });
    return { outstanding, overdueCount, paidCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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
        description="See every invoice and its balance — filter by customer, status, or search to find what you need."
        eyebrow="Invoices"
        title="Invoices"
        meta={
          items.length ? (
            <div className="page-header-chips" aria-label="Page summary">
              <span className={`summary-chip${pageSummary.outstanding > 0 ? " tone-danger" : " tone-success"}`}>
                <em>{toMoney(pageSummary.outstanding)}</em>
                <small>Outstanding on this page</small>
              </span>
              {pageSummary.overdueCount > 0 ? (
                <span className="summary-chip tone-danger">
                  <em>{pageSummary.overdueCount}</em>
                  <small>Overdue</small>
                </span>
              ) : null}
              <span className="summary-chip tone-success">
                <em>{pageSummary.paidCount}</em>
                <small>Paid</small>
              </span>
            </div>
          ) : null
        }
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

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading invoices" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No invoices match the current filters." : "No invoices found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
        <div className="resource-table">
          <div className="resource-table-head invoice-grid">
            <span>Invoice</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span>Outstanding</span>
            <span className="actions-col">Actions</span>
          </div>
          {items.map((invoice) => {
            const overdue = isOverdue(invoice);
            const balance = Number(invoice.balanceDue || 0);
            const outstandingClass = balance <= 0
              ? "amount-cell tone-success"
              : overdue
                ? "amount-cell tone-danger"
                : "amount-cell tone-warning";
            return (
              <article
                className={`resource-row invoice-grid invoice-row${overdue ? " is-overdue" : ""}`}
                key={invoice.id}
              >
                <div className="invoice-row-identity">
                  <strong>
                    <button
                      className="link-button"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                      type="button"
                    >
                      {invoice.invoiceNumber}
                    </button>
                    <AttachmentBadge
                      count={attachmentCounts[invoice.id]}
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    />
                  </strong>
                  <span>
                    {invoice.issueDate
                      ? `Issued ${formatDateWith(settings, invoice.issueDate)}`
                      : `Created ${formatDateWith(settings, invoice.createdAt)}`}
                    {invoice.dueDate ? ` · Due ${formatDateWith(settings, invoice.dueDate)}` : ""}
                  </span>
                </div>
                <span>{formatCustomer(invoice.customer)}</span>
                <StatusPill
                  kind="invoice"
                  status={overdue ? "overdue" : invoice.status}
                />
                <span className="amount-cell">{toMoney(invoice.grandTotal)}</span>
                <span className={outstandingClass}>{toMoney(invoice.balanceDue)}</span>
                <button
                  className="secondary-button compact"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  type="button"
                >
                  View
                </button>
              </article>
            );
          })}
        </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default InvoiceListScreen;
