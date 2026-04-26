import { useCallback, useMemo, useState } from "react";
import { listInvoices } from "../../services/invoiceApi.js";
import {
  ErrorState,
  LoadingSkeleton,
  Pagination
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

const invoiceStatuses = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" }
];

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isOverdueInvoice(invoice, today) {
  if (!invoice.dueDate) return false;
  const dueDateOnly = String(invoice.dueDate).slice(0, 10);
  return (
    dueDateOnly < today &&
    invoice.status !== "paid" &&
    invoice.status !== "void" &&
    Number(invoice.balanceDue || 0) > 0
  );
}

function KpiCard({ tone, label, value, hint }) {
  return (
    <article className="invoices-kpi-card" data-tone={tone}>
      <span className="invoices-kpi-label">{label}</span>
      <strong className="invoices-kpi-value">{value}</strong>
      {hint ? <small className="invoices-kpi-hint">{hint}</small> : null}
    </article>
  );
}

function InvoiceListScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const query = useMemo(
    () => ({ page, pageSize, search, status }),
    [page, pageSize, search, status]
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
  const hasFilters = Boolean(search || status);
  const today = todayIsoDate();

  const kpis = useMemo(() => {
    let paidAmount = 0;
    let outstandingAmount = 0;
    let overdueCount = 0;
    items.forEach((invoice) => {
      const grand = Number(invoice.grandTotal || 0);
      const balance = Number(invoice.balanceDue || 0);
      if (invoice.status === "paid") {
        paidAmount += grand;
      } else if (invoice.status !== "void") {
        const paid = Math.max(grand - balance, 0);
        paidAmount += paid;
      }
      outstandingAmount += balance;
      if (isOverdueInvoice(invoice, today)) overdueCount += 1;
    });
    return { paidAmount, outstandingAmount, overdueCount };
  }, [items, today]);

  const totalInvoices = data?.pagination?.totalItems ?? items.length;

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearchDraft("");
    setSearch("");
    setStatus("");
    setPage(1);
  }

  function goToInvoice(invoiceId) {
    navigate(`/invoices/${invoiceId}`);
  }

  return (
    <div className="resource-page invoices-page">
      <header className="invoices-header">
        <div className="invoices-header-copy">
          <h1>Invoices</h1>
          <p>Manage your billing and track payments</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/invoices/new")}
          type="button"
        >
          + New invoice
        </button>
      </header>

      <section className="invoices-kpi-grid" aria-label="Invoice summary">
        <KpiCard
          tone="info"
          label="Total invoices"
          value={Number(totalInvoices || 0).toLocaleString()}
          hint="All invoices"
        />
        <KpiCard
          tone="success"
          label="Paid amount"
          value={toMoney(kpis.paidAmount)}
          hint="On this page"
        />
        <KpiCard
          tone="warning"
          label="Outstanding"
          value={toMoney(kpis.outstandingAmount)}
          hint="On this page"
        />
        <KpiCard
          tone="danger"
          label="Overdue"
          value={Number(kpis.overdueCount || 0).toLocaleString()}
          hint="Needs attention"
        />
      </section>

      <form className="invoices-filter-bar" onSubmit={submitSearch} role="search">
        <div className="invoices-search-input">
          <span className="invoices-search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="M20 20L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <input
            aria-label="Search invoices"
            onChange={(event) => setSearchDraft(event.target.value)}
            onBlur={() => {
              if (searchDraft.trim() !== search) {
                setSearch(searchDraft.trim());
                setPage(1);
              }
            }}
            placeholder="Search invoice number or notes"
            type="search"
            value={searchDraft}
          />
        </div>
        <select
          aria-label="Filter by status"
          className="invoices-status-select"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {invoiceStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <button type="button" className="btn-ghost" onClick={resetFilters}>
            Clear
          </button>
        ) : null}
      </form>

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading invoices" rows={5} /> : null}

      {!isLoading && !items.length && !error ? (
        hasFilters ? (
          <div className="invoices-empty">
            <strong>No invoices match these filters</strong>
            <p>Try a different search term or status, or clear the filters to see everything.</p>
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="invoices-empty">
            <strong>No invoices yet</strong>
            <p>Create your first invoice to start tracking payments.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/invoices/new")}
            >
              + Create invoice
            </button>
          </div>
        )
      ) : null}

      {items.length ? (
        <div className="invoices-table" role="table" aria-label="Invoices">
          <div className="invoices-table-head" role="row">
            <span role="columnheader">Invoice #</span>
            <span role="columnheader">Customer</span>
            <span role="columnheader" className="invoices-cell-amount">Amount</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Due date</span>
            <span role="columnheader" className="invoices-cell-actions">Actions</span>
          </div>
          {items.map((invoice) => {
            const overdue = isOverdueInvoice(invoice, today);
            return (
              <div
                key={invoice.id}
                role="row"
                tabIndex={0}
                className={`invoices-table-row${overdue ? " is-overdue" : ""}`}
                onClick={() => goToInvoice(invoice.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    goToInvoice(invoice.id);
                  }
                }}
              >
                <span role="cell" className="invoices-cell-number">
                  <strong>{invoice.invoiceNumber}</strong>
                  <AttachmentBadge
                    count={attachmentCounts[invoice.id]}
                    onClick={(event) => {
                      if (event && typeof event.stopPropagation === "function") {
                        event.stopPropagation();
                      }
                      goToInvoice(invoice.id);
                    }}
                  />
                </span>
                <span role="cell" className="invoices-cell-customer">
                  {formatCustomer(invoice.customer)}
                </span>
                <span role="cell" className="invoices-cell-amount">
                  {toMoney(invoice.grandTotal)}
                </span>
                <span role="cell">
                  <StatusPill
                    kind="invoice"
                    status={overdue ? "overdue" : invoice.status}
                  />
                </span>
                <span role="cell" className="invoices-cell-due">
                  {invoice.dueDate ? formatDateWith(settings, invoice.dueDate) : "—"}
                </span>
                <span role="cell" className="invoices-cell-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      goToInvoice(invoice.id);
                    }}
                  >
                    View
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default InvoiceListScreen;
