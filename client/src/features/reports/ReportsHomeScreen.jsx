import { useCallback, useEffect, useState } from "react";
import { getReportSummary } from "../../services/reportApi.js";
import {
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { formatReportError, toMoney } from "./reportUtils.js";

const reportCards = [
  {
    description: "Customer receivables grouped from invoice report data.",
    label: "Receivables",
    path: "/reports/receivables"
  },
  {
    description: "Invoice status, due dates, totals, and outstanding balances.",
    label: "Invoices",
    path: "/reports/invoices"
  },
  {
    description: "Payment activity by date, customer, method, and invoice.",
    label: "Payments",
    path: "/reports/payments"
  },
  {
    description: "Order activity by date, status, customer, and total.",
    label: "Orders",
    path: "/reports/orders"
  },
  {
    description: "Download customer statement CSV files.",
    label: "Statements",
    path: "/reports/statements"
  }
];

function ReportsHomeScreen({ navigate }) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reloadSummary = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const response = await getReportSummary({}, { signal: controller.signal });

        if (active) {
          setSummary(response.data.metrics);
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = formatReportError(requestError, "Report summary could not be loaded.");
        setError(message);
        showToast({ message, title: "Reports unavailable", tone: "error" });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
      controller.abort();
    };
  }, [showToast, reloadKey]);

  return (
    <div className="resource-page">
      <PageHeader
        description="Operational and financial reports using the existing reporting endpoints."
        eyebrow="Reports"
        title="Reports and Exports"
      />

      <SectionHeader
        title="At a Glance"
        hint="Live totals across the reporting endpoints"
      />

      <ErrorState message={error} onRetry={reloadSummary} />
      {isLoading ? <LoadingSkeleton label="Loading report summary" rows={2} /> : null}

      {summary ? (
        <section className="metric-strip reports-summary-strip">
          <article className="metric-tile">
            <span>Invoice total</span>
            <strong>{toMoney(summary.invoiceTotal)}</strong>
            <small>{summary.totalInvoices} invoices</small>
          </article>
          <article className="metric-tile">
            <span>Payment total</span>
            <strong>{toMoney(summary.paymentTotal)}</strong>
            <small>{summary.totalPayments} payments</small>
          </article>
          <article className="metric-tile">
            <span>Outstanding</span>
            <strong>{toMoney(summary.outstandingReceivables)}</strong>
            <small>Open receivables</small>
          </article>
          <article className="metric-tile">
            <span>Order total</span>
            <strong>{toMoney(summary.orderTotal)}</strong>
            <small>{summary.totalOrders} orders</small>
          </article>
        </section>
      ) : null}

      <SectionHeader title="Open a Report" hint={`${reportCards.length} reports available`} />

      <section className="report-card-grid">
        {reportCards.map((card) => (
          <article className="report-card" key={card.path}>
            <div>
              <h3>{card.label}</h3>
              <p>{card.description}</p>
            </div>
            <button className="primary-button" onClick={() => navigate(card.path)} type="button">
              Open report
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default ReportsHomeScreen;
