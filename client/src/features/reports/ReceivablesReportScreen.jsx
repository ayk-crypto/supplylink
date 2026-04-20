import { useCallback, useMemo, useState } from "react";
import { exportInvoicesCsv, listInvoiceReport } from "../../services/reportApi.js";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  Pagination,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import DateRangePresetChips from "./DateRangePresetChips.jsx";
import {
  cleanReportParams,
  formatCustomer,
  formatReportError,
  getPaidFromInvoice,
  toMoney,
  toNumber
} from "./reportUtils.js";

function groupReceivables(invoices) {
  const groups = new Map();

  invoices.forEach((invoice) => {
    const customerId = invoice.customer?.id || "unknown";
    const current = groups.get(customerId) || {
      customer: invoice.customer,
      invoiceCount: 0,
      invoiceTotal: 0,
      outstandingTotal: 0,
      paidTotal: 0
    };

    current.invoiceCount += 1;
    current.invoiceTotal += toNumber(invoice.grandTotal);
    current.outstandingTotal += toNumber(invoice.balanceDue);
    current.paidTotal += getPaidFromInvoice(invoice);
    groups.set(customerId, current);
  });

  return [...groups.values()];
}

function ReceivablesReportScreen({ navigate }) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    outstandingOnly: true,
    search: "",
    searchDraft: ""
  });
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const query = useMemo(
    () =>
      cleanReportParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page,
        pageSize: 100,
        search: filters.search
      }),
    [filters, page]
  );
  const loadInvoices = useCallback((params, options) => listInvoiceReport(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: formatReportError(requestError, "Receivables report could not be loaded."),
        title: "Receivables unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadInvoices, query, {
    onError: handleListError
  });
  const invoices = data?.items || [];
  const rows = groupReceivables(invoices).filter(
    (row) => !filters.outstandingOnly || row.outstandingTotal > 0
  );
  const totals = rows.reduce(
    (summary, row) => ({
      invoiceTotal: summary.invoiceTotal + row.invoiceTotal,
      outstandingTotal: summary.outstandingTotal + row.outstandingTotal,
      paidTotal: summary.paidTotal + row.paidTotal
    }),
    {
      invoiceTotal: 0,
      outstandingTotal: 0,
      paidTotal: 0
    }
  );

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      search: current.searchDraft.trim()
    }));
    setPage(1);
  }

  async function exportCsv() {
    setIsExporting(true);

    try {
      await exportInvoicesCsv(query);
      showToast({
        message: "Invoice CSV download started for the current receivables filters.",
        title: "Export ready"
      });
    } catch (requestError) {
      showToast({
        message: formatReportError(requestError, "Receivables export could not be downloaded."),
        title: "Export failed",
        tone: "error"
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button className="secondary-button" disabled={isExporting} onClick={exportCsv} type="button">
              {isExporting ? "Exporting..." : "Export invoice CSV"}
            </button>
            <button className="secondary-button" onClick={() => navigate("/reports")} type="button">
              Back to reports
            </button>
          </div>
        }
        description="Customer receivables grouped from invoice report data."
        eyebrow="Reports"
        title="Receivables report"
      />

      <section className="metric-strip reports-summary-strip">
        <article className="metric-tile">
          <span>Invoice total</span>
          <strong>{toMoney(totals.invoiceTotal)}</strong>
          <small>Visible grouped invoices</small>
        </article>
        <article className="metric-tile">
          <span>Paid total</span>
          <strong>{toMoney(totals.paidTotal)}</strong>
          <small>Derived from invoice balances</small>
        </article>
        <article className="metric-tile">
          <span>Outstanding</span>
          <strong>{toMoney(totals.outstandingTotal)}</strong>
          <small>Open customer receivables</small>
        </article>
      </section>

      <form className="report-filter-panel" onSubmit={applyFilters}>
        <div className="form-grid">
          <Field label="Search">
            <input
              onChange={(event) => updateFilter("searchDraft", event.target.value)}
              placeholder="Search invoice or customer"
              type="search"
              value={filters.searchDraft}
            />
          </Field>
          <Field label="Quick range">
            <DateRangePresetChips
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onApply={(range) => {
                setFilters((current) => ({ ...current, ...range }));
                setPage(1);
              }}
            />
          </Field>
          <Field label="Date from">
            <input
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
              type="date"
              value={filters.dateFrom}
            />
          </Field>
          <Field label="Date to">
            <input
              onChange={(event) => updateFilter("dateTo", event.target.value)}
              type="date"
              value={filters.dateTo}
            />
          </Field>
          <Field label="View">
            <select
              onChange={(event) => updateFilter("outstandingOnly", event.target.value === "outstanding")}
              value={filters.outstandingOnly ? "outstanding" : ""}
            >
              <option value="outstanding">Outstanding only</option>
              <option value="">All invoice customers</option>
            </select>
          </Field>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="submit">
            Apply filters
          </button>
        </div>
      </form>

      <ErrorState message={error} onRetry={reload} />
      {isLoading ? <LoadingState>Loading receivables…</LoadingState> : null}
      {!isLoading && !rows.length ? <EmptyState>No receivables match the current filters.</EmptyState> : null}

      {rows.length ? (
        <TableScroll>
        <div className="resource-table">
          <div className="resource-table-head report-receivable-grid">
            <span>Customer</span>
            <span>Invoices</span>
            <span>Invoice total</span>
            <span>Paid</span>
            <span>Outstanding</span>
            <span />
          </div>
          {rows.map((row) => (
            <article className="resource-row report-receivable-grid" key={row.customer?.id || row.customer?.email}>
              <div>
                <strong>{formatCustomer(row.customer)}</strong>
                <span>{row.customer?.email || row.customer?.accountCode || "No contact"}</span>
              </div>
              <span>{row.invoiceCount}</span>
              <span>{toMoney(row.invoiceTotal)}</span>
              <span>{toMoney(row.paidTotal)}</span>
              <span>{toMoney(row.outstandingTotal)}</span>
              <button
                className="secondary-button compact"
                disabled={!row.customer?.id}
                onClick={() => navigate(`/ledger/customers/${row.customer.id}`)}
                type="button"
              >
                Statement
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

export default ReceivablesReportScreen;
