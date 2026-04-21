import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import {
  exportInvoicesCsv,
  exportOrdersCsv,
  exportPaymentsCsv,
  listInvoiceReport,
  listOrderReport,
  listPaymentReport
} from "../../services/reportApi.js";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  Pagination,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateWith, getDefaultPageSize } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import DateRangePresetChips from "./DateRangePresetChips.jsx";
import {
  cleanReportParams,
  formatCustomer,
  formatReportError,
  getPaidFromInvoice,
  invoiceStatuses,
  orderStatuses,
  toMoney,
  toNumber
} from "./reportUtils.js";

const reportConfigs = {
  invoices: {
    description: "Invoice status, issue dates, due dates, totals, paid amounts, and outstanding balances.",
    exportCsv: exportInvoicesCsv,
    exportName: "invoices CSV",
    list: listInvoiceReport,
    title: "Invoice report"
  },
  orders: {
    description: "Order status, customer, dates, and totals.",
    exportCsv: exportOrdersCsv,
    exportName: "orders CSV",
    list: listOrderReport,
    title: "Orders report"
  },
  payments: {
    description: "Payment activity by customer, invoice, method, reference, and date.",
    exportCsv: exportPaymentsCsv,
    exportName: "payments CSV",
    list: listPaymentReport,
    title: "Payments report"
  }
};

function ReportFilters({ customers, filters, kind, onApplyDateRange, onChange, onSubmit }) {
  const showStatus = kind === "invoices" || kind === "orders";
  const showPaymentMethod = kind === "payments";
  const statuses = kind === "orders" ? orderStatuses : invoiceStatuses;

  return (
    <form className="report-filter-panel" onSubmit={onSubmit}>
      <div className="form-grid">
        <Field label="Quick range">
          <DateRangePresetChips
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onApply={onApplyDateRange}
          />
        </Field>
        <Field label="Search">
          <input
            onChange={(event) => onChange("searchDraft", event.target.value)}
            placeholder={`Search ${kind}`}
            type="search"
            value={filters.searchDraft}
          />
        </Field>
        <Field label="Customer">
          <select onChange={(event) => onChange("customerId", event.target.value)} value={filters.customerId}>
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
        </Field>
        {showStatus ? (
          <Field label="Status">
            <select onChange={(event) => onChange("status", event.target.value)} value={filters.status}>
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {showPaymentMethod ? (
          <Field label="Payment method">
            <input
              onChange={(event) => onChange("paymentMethod", event.target.value)}
              placeholder="bank_transfer"
              type="text"
              value={filters.paymentMethod}
            />
          </Field>
        ) : null}
        <Field label="Date from">
          <input
            onChange={(event) => onChange("dateFrom", event.target.value)}
            type="date"
            value={filters.dateFrom}
          />
        </Field>
        <Field label="Date to">
          <input
            onChange={(event) => onChange("dateTo", event.target.value)}
            type="date"
            value={filters.dateTo}
          />
        </Field>
      </div>
      <div className="form-actions">
        <button className="secondary-button" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  );
}

function InvoiceRows({ items, navigate, settings }) {
  return (
    <TableScroll>
    <div className="resource-table">
      <div className="resource-table-head report-invoice-grid">
        <span>Invoice</span>
        <span>Customer</span>
        <span>Status</span>
        <span>Dates</span>
        <span>Total</span>
        <span>Paid</span>
        <span>Outstanding</span>
      </div>
      {items.map((invoice) => (
        <article className="resource-row report-invoice-grid" key={invoice.id}>
          <button className="link-button" onClick={() => navigate(`/invoices/${invoice.id}`)} type="button">
            {invoice.invoiceNumber}
          </button>
          <span>{formatCustomer(invoice.customer)}</span>
          <StatusPill kind="invoice" status={invoice.status} />
          <div>
            <strong>{invoice.issueDate ? formatDateWith(settings, invoice.issueDate) : "No issue date"}</strong>
            <span>{invoice.dueDate ? formatDateWith(settings, invoice.dueDate) : "No due date"}</span>
          </div>
          <span>{toMoney(invoice.grandTotal)}</span>
          <span>{toMoney(getPaidFromInvoice(invoice))}</span>
          <span>{toMoney(invoice.balanceDue)}</span>
        </article>
      ))}
    </div>
    </TableScroll>
  );
}

function PaymentRows({ items, settings }) {
  return (
    <TableScroll>
    <div className="resource-table">
      <div className="resource-table-head report-payment-grid">
        <span>Date</span>
        <span>Customer</span>
        <span>Invoice</span>
        <span>Amount</span>
        <span>Method</span>
        <span>Reference / note</span>
      </div>
      {items.map((payment) => (
        <article className="resource-row report-payment-grid" key={payment.id}>
          <span>{formatDateWith(settings, payment.paymentDate || payment.createdAt)}</span>
          <span>{formatCustomer(payment.customer)}</span>
          <span>{payment.invoice?.invoiceNumber || "On account"}</span>
          <span>{toMoney(payment.amount)}</span>
          <span>{payment.paymentMethod || "Not set"}</span>
          <div>
            <strong>{payment.referenceNumber || "No reference"}</strong>
            <span>{payment.notes || "No notes"}</span>
          </div>
        </article>
      ))}
    </div>
    </TableScroll>
  );
}

function OrderRows({ items, navigate, settings }) {
  return (
    <TableScroll>
    <div className="resource-table">
      <div className="resource-table-head report-order-grid">
        <span>Order</span>
        <span>Customer</span>
        <span>Status</span>
        <span>Date</span>
        <span>Total</span>
      </div>
      {items.map((order) => (
        <article className="resource-row report-order-grid" key={order.id}>
          <button className="link-button" onClick={() => navigate(`/orders/${order.id}`)} type="button">
            {order.orderNumber}
          </button>
          <span>{formatCustomer(order.customer)}</span>
          <StatusPill kind="order" status={order.status} />
          <div>
            <strong>{formatDateWith(settings, order.orderDate || order.createdAt)}</strong>
            <span>{order.deliveryDate ? formatDateWith(settings, order.deliveryDate) : "No delivery date"}</span>
          </div>
          <span>{toMoney(order.grandTotal)}</span>
        </article>
      ))}
    </div>
    </TableScroll>
  );
}

function OperationalReportScreen({ kind, navigate }) {
  const config = reportConfigs[kind];
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({
    customerId: "",
    dateFrom: "",
    dateTo: "",
    paymentMethod: "",
    search: "",
    searchDraft: "",
    status: ""
  });
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 20);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const query = useMemo(
    () =>
      cleanReportParams({
        customerId: filters.customerId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page,
        pageSize,
        paymentMethod: kind === "payments" ? filters.paymentMethod.trim() : "",
        search: filters.search,
        status: kind === "invoices" || kind === "orders" ? filters.status : ""
      }),
    [filters, kind, page, pageSize]
  );
  const loadReport = useCallback((params, options) => config.list(params, options), [config]);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: formatReportError(requestError, `${config.title} could not be loaded.`),
        title: "Report unavailable",
        tone: "error"
      });
    },
    [config, showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadReport, query, {
    onError: handleListError
  });
  const items = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCustomers() {
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
          message: formatReportError(requestError, "Customer filters could not be loaded."),
          title: "Customer filter unavailable",
          tone: "error"
        });
      }
    }

    loadCustomers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [showToast]);

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

  function applyDateRange(range) {
    setFilters((current) => ({ ...current, dateFrom: range.dateFrom, dateTo: range.dateTo }));
    setPage(1);
  }

  const summary = useMemo(() => {
    if (kind === "invoices") {
      return items.reduce(
        (acc, invoice) => ({
          count: acc.count + 1,
          grandTotal: acc.grandTotal + toNumber(invoice.grandTotal),
          paid: acc.paid + getPaidFromInvoice(invoice),
          outstanding: acc.outstanding + toNumber(invoice.balanceDue)
        }),
        { count: 0, grandTotal: 0, paid: 0, outstanding: 0 }
      );
    }
    if (kind === "orders") {
      return items.reduce(
        (acc, order) => ({
          count: acc.count + 1,
          grandTotal: acc.grandTotal + toNumber(order.grandTotal)
        }),
        { count: 0, grandTotal: 0 }
      );
    }
    if (kind === "payments") {
      return items.reduce(
        (acc, payment) => ({
          count: acc.count + 1,
          amount: acc.amount + toNumber(payment.amount)
        }),
        { count: 0, amount: 0 }
      );
    }
    return null;
  }, [items, kind]);

  const totalCount = data?.pagination?.total;
  const summaryHint =
    typeof totalCount === "number" && totalCount > items.length
      ? `Visible page totals · ${items.length} of ${totalCount} matching ${kind}`
      : `Totals across the visible ${kind}`;

  async function exportCsv() {
    setIsExporting(true);

    try {
      await config.exportCsv(query);
      showToast({
        message: `${config.exportName} download started.`,
        title: "Export ready"
      });
    } catch (requestError) {
      showToast({
        message: formatReportError(requestError, `${config.exportName} could not be downloaded.`),
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
              {isExporting ? "Exporting..." : `Export ${config.exportName}`}
            </button>
            <button className="secondary-button" onClick={() => navigate("/reports")} type="button">
              Back to reports
            </button>
          </div>
        }
        description={config.description}
        eyebrow="Reports"
        title={config.title}
      />

      <ReportFilters
        customers={customers}
        filters={filters}
        kind={kind}
        onApplyDateRange={applyDateRange}
        onChange={updateFilter}
        onSubmit={applyFilters}
      />

      {summary && items.length ? (
        <section className="metric-strip reports-summary-strip" aria-label="Report summary">
          {kind === "invoices" ? (
            <>
              <article className="metric-tile">
                <span>Invoices</span>
                <strong>{summary.count}</strong>
                <small>{summaryHint}</small>
              </article>
              <article className="metric-tile">
                <span>Invoice total</span>
                <strong>{toMoney(summary.grandTotal)}</strong>
                <small>Sum of grand totals</small>
              </article>
              <article className="metric-tile">
                <span>Paid</span>
                <strong>{toMoney(summary.paid)}</strong>
                <small>Derived from balances</small>
              </article>
              <article className="metric-tile">
                <span>Outstanding</span>
                <strong>{toMoney(summary.outstanding)}</strong>
                <small>Open balance</small>
              </article>
            </>
          ) : null}
          {kind === "orders" ? (
            <>
              <article className="metric-tile">
                <span>Orders</span>
                <strong>{summary.count}</strong>
                <small>{summaryHint}</small>
              </article>
              <article className="metric-tile">
                <span>Order total</span>
                <strong>{toMoney(summary.grandTotal)}</strong>
                <small>Sum of grand totals</small>
              </article>
            </>
          ) : null}
          {kind === "payments" ? (
            <>
              <article className="metric-tile">
                <span>Payments</span>
                <strong>{summary.count}</strong>
                <small>{summaryHint}</small>
              </article>
              <article className="metric-tile">
                <span>Payment total</span>
                <strong>{toMoney(summary.amount)}</strong>
                <small>Sum of amounts received</small>
              </article>
            </>
          ) : null}
        </section>
      ) : null}

      <ErrorState message={error} onRetry={reload} />
      {isLoading ? <LoadingState>Loading {kind} report…</LoadingState> : null}
      {!isLoading && !items.length ? <EmptyState>No report rows match the current filters.</EmptyState> : null}

      {items.length && kind === "invoices" ? <InvoiceRows items={items} navigate={navigate} settings={settings} /> : null}
      {items.length && kind === "payments" ? <PaymentRows items={items} settings={settings} /> : null}
      {items.length && kind === "orders" ? <OrderRows items={items} navigate={navigate} settings={settings} /> : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default OperationalReportScreen;
