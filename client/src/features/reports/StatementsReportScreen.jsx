import { useEffect, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import {
  exportCustomerStatementCsv,
  getCustomerStatementReport
} from "../../services/reportApi.js";
import {
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import {
  formatCustomer,
  formatReportError,
  toMoney
} from "./reportUtils.js";

function StatementsReportScreen({ navigate }) {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customerId: "",
    dateFrom: "",
    dateTo: ""
  });
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
          setCustomers(response.data.items || []);
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        showToast({
          message: formatReportError(requestError, "Customers could not be loaded."),
          title: "Customers unavailable",
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

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function getParams() {
    return {
      dateFrom: form.dateFrom,
      dateTo: form.dateTo
    };
  }

  async function loadStatement(event) {
    event.preventDefault();

    if (!form.customerId) {
      showToast({
        message: "Select a customer before loading a statement.",
        title: "Customer required",
        tone: "error"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await getCustomerStatementReport(form.customerId, getParams());

      setStatement(response.data);
    } catch (requestError) {
      showToast({
        message: formatReportError(requestError, "Customer statement could not be loaded."),
        title: "Statement unavailable",
        tone: "error"
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function exportStatement() {
    if (!form.customerId) {
      showToast({
        message: "Select a customer before exporting a statement.",
        title: "Customer required",
        tone: "error"
      });
      return;
    }

    setIsExporting(true);

    try {
      await exportCustomerStatementCsv(form.customerId, getParams());
      showToast({
        message: "Customer statement CSV download started.",
        title: "Export ready"
      });
    } catch (requestError) {
      showToast({
        message: formatReportError(requestError, "Statement CSV could not be downloaded."),
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
          <button className="secondary-button" onClick={() => navigate("/reports")} type="button">
            Back to reports
          </button>
        }
        description="Preview and export customer statement reports."
        eyebrow="Reports"
        title="Customer statements"
      />

      <form className="report-filter-panel" onSubmit={loadStatement}>
        <div className="form-grid">
          <Field label="Customer">
            <select
              onChange={(event) => updateField("customerId", event.target.value)}
              value={form.customerId}
            >
              <option value="">Select customer</option>
              {customers.map((record) => (
                <option key={record.customer.id} value={record.customer.id}>
                  {formatCustomer(record.customer)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date from">
            <input
              onChange={(event) => updateField("dateFrom", event.target.value)}
              type="date"
              value={form.dateFrom}
            />
          </Field>
          <Field label="Date to">
            <input
              onChange={(event) => updateField("dateTo", event.target.value)}
              type="date"
              value={form.dateTo}
            />
          </Field>
        </div>
        <div className="form-actions">
          <button className="secondary-button" disabled={isExporting} onClick={exportStatement} type="button">
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Loading..." : "Load statement"}
          </button>
        </div>
      </form>

      {statement ? (
        <>
          <section className="detail-grid">
            <div className="detail-field">
              <span>Customer</span>
              <strong>{formatCustomer(statement.customer)}</strong>
            </div>
            <div className="detail-field">
              <span>Opening balance</span>
              <strong>{toMoney(statement.openingBalance)}</strong>
            </div>
            <div className="detail-field">
              <span>Ending balance</span>
              <strong>{toMoney(statement.endingBalance)}</strong>
            </div>
          </section>

          <section className="transaction-panel">
            <div className="panel-heading">
              <h3>Statement entries</h3>
              <span>{statement.items.length} entries</span>
            </div>
            {statement.items.length ? (
              <TableScroll>
              <div className="resource-table">
                <div className="resource-table-head statement-grid">
                  <span>Date</span>
                  <span>Document</span>
                  <span>Type</span>
                  <span>Debit</span>
                  <span>Credit</span>
                  <span>Balance</span>
                </div>
                {statement.items.map((entry) => (
                  <article className="resource-row statement-grid" key={entry.id}>
                    <span>{entry.entryDate}</span>
                    <div>
                      <strong>{entry.invoice?.invoiceNumber || entry.payment?.referenceNumber || entry.id}</strong>
                      <span>{entry.notes || "No notes"}</span>
                    </div>
                    <span className="status-pill">{entry.sourceType}</span>
                    <span>{entry.entryType === "debit" ? toMoney(entry.amount) : "-"}</span>
                    <span>{entry.entryType === "credit" ? toMoney(entry.amount) : "-"}</span>
                    <span>{toMoney(entry.runningBalance)}</span>
                  </article>
                ))}
              </div>
              </TableScroll>
            ) : (
              <p className="empty-panel">No statement entries found for this period.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

export default StatementsReportScreen;
