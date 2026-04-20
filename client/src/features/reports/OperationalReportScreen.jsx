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
  Field,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import {
  cleanReportParams,
  formatCustomer,
  formatReportError,
  getPaidFromInvoice,
  invoiceStatuses,
  orderStatuses,
  toMoney
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

function ReportFilters({ customers, filters, kind, onChange, onSubmit }) {
  const showStatus = kind === "invoices" || kind === "orders";
  const showPaymentMethod = kind === "payments";
  const statuses = kind === "orders" ? orderStatuses : invoiceStatuses;

  return (
    <form className="report-filter-panel" onSubmit={onSubmit}>
      <div className="form-grid">
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

function InvoiceRows({ items, navigate }) {
  return (
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
          <span className="status-pill">{invoice.status}</span>
          <div>
            <strong>{invoice.issueDate || "No issue date"}</strong>
            <span>{invoice.dueDate || "No due date"}</span>
          </div>
          <span>{toMoney(invoice.grandTotal)}</span>
          <span>{toMoney(getPaidFromInvoice(invoice))}</span>
          <span>{toMoney(invoice.balanceDue)}</span>
        </article>
      ))}
    </div>
  );
}

function PaymentRows({ items }) {
  return (
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
          <span>{payment.paymentDate || payment.createdAt}</span>
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
  );
}

function OrderRows({ items, navigate }) {
  return (
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
          <span className="status-pill">{order.status}</span>
          <div>
            <strong>{order.orderDate || order.createdAt}</strong>
            <span>{order.deliveryDate || "No delivery date"}</span>
          </div>
          <span>{toMoney(order.grandTotal)}</span>
        </article>
      ))}
    </div>
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
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const query = useMemo(
    () =>
      cleanReportParams({
        customerId: filters.customerId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page,
        pageSize: 20,
        paymentMethod: kind === "payments" ? filters.paymentMethod.trim() : "",
        search: filters.search,
        status: kind === "invoices" || kind === "orders" ? filters.status : ""
      }),
    [filters, kind, page]
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
  const { data, error, isLoading } = useResourceDirectory(loadReport, query, {
    onError: handleListError
  });
  const items = data?.items || [];

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
        onChange={updateFilter}
        onSubmit={applyFilters}
      />

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message">Loading {kind} report...</p> : null}
      {!isLoading && !items.length ? <EmptyState>No report rows match the current filters.</EmptyState> : null}

      {items.length && kind === "invoices" ? <InvoiceRows items={items} navigate={navigate} /> : null}
      {items.length && kind === "payments" ? <PaymentRows items={items} /> : null}
      {items.length && kind === "orders" ? <OrderRows items={items} navigate={navigate} /> : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default OperationalReportScreen;
