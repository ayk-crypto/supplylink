import { useCallback, useEffect, useMemo, useState } from "react";
import { getCustomer } from "../../services/masterDataApi.js";
import { getCustomerLedger } from "../../services/ledgerApi.js";
import { exportCustomerStatementCsv } from "../../services/reportApi.js";
import { Field, PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import {
  getCustomerLabel,
  getEntryCredit,
  getEntryDebit,
  getLedgerReference,
  toMoney
} from "./ledgerUtils.js";

const entryTypes = ["debit", "credit"];
const sourceTypes = ["invoice", "payment", "adjustment", "opening_balance"];

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function isWithinDateRange(entry, dateFrom, dateTo) {
  if (dateFrom && entry.entryDate < dateFrom) {
    return false;
  }

  if (dateTo && entry.entryDate > dateTo) {
    return false;
  }

  return true;
}

function CustomerLedgerScreen({ id, navigate }) {
  const { showToast } = useToast();
  const [customer, setCustomer] = useState(null);
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    entryType: "",
    sourceType: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadStatement = useCallback(
    async ({ signal } = {}) => {
      const [customerResponse, ledgerResponse] = await Promise.all([
        getCustomer(id, { signal }),
        getCustomerLedger(id, { signal })
      ]);

      setCustomer(customerResponse.data);
      setStatement(ledgerResponse.data);
    },
    [id]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        await loadStatement({ signal: controller.signal });
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = getApiErrorMessage(requestError, "Customer ledger could not load.");

        setError(message);
        showToast({
          message,
          title: "Customer ledger unavailable",
          tone: "error"
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadStatement, showToast]);

  const filteredEntries = useMemo(() => {
    const items = statement?.items || [];

    return items.filter(
      (entry) =>
        (!filters.entryType || entry.entryType === filters.entryType) &&
        (!filters.sourceType || entry.sourceType === filters.sourceType) &&
        isWithinDateRange(entry, filters.dateFrom, filters.dateTo)
    );
  }, [filters, statement]);

  const filteredTotals = filteredEntries.reduce(
    (summary, entry) => ({
      credit: summary.credit + getEntryCredit(entry),
      debit: summary.debit + getEntryDebit(entry)
    }),
    {
      credit: 0,
      debit: 0
    }
  );

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function exportStatement() {
    setIsExporting(true);

    try {
      await exportCustomerStatementCsv(id, {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });
      showToast({
        message: "Customer statement CSV download started.",
        title: "Export ready"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Customer statement CSV could not be downloaded."),
        title: "Export failed",
        tone: "error"
      });
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return <p className="surface-message">Loading customer statement...</p>;
  }

  if (error) {
    return <p className="surface-message error">{error}</p>;
  }

  if (!statement) {
    return <p className="surface-message">No customer ledger found.</p>;
  }

  const displayCustomer = customer?.customer || filteredEntries[0]?.customer || {
    id,
    fullName: "Customer"
  };

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button className="secondary-button" disabled={isExporting} onClick={exportStatement} type="button">
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>
            <button className="secondary-button" onClick={() => navigate("/ledger")} type="button">
              Back to ledger
            </button>
          </div>
        }
        description="Statement-style receivables history with debit, credit, and running balance."
        eyebrow="Customer statement"
        title={getCustomerLabel(displayCustomer)}
      />

      <section className="detail-grid">
        <DetailField label="Ending balance" value={toMoney(statement.endingBalance)} />
        <DetailField label="Filtered debits" value={toMoney(filteredTotals.debit)} />
        <DetailField label="Filtered credits" value={toMoney(filteredTotals.credit)} />
        <DetailField label="Email" value={displayCustomer.email} />
        <DetailField label="Phone" value={displayCustomer.phone} />
        <DetailField label="Relationship status" value={customer?.relationship?.status} />
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Statement filters</h3>
          <span>{filteredEntries.length} entries</span>
        </div>
        <div className="form-grid">
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
          <Field label="Entry type">
            <select
              onChange={(event) => updateFilter("entryType", event.target.value)}
              value={filters.entryType}
            >
              <option value="">All entry types</option>
              {entryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source type">
            <select
              onChange={(event) => updateFilter("sourceType", event.target.value)}
              value={filters.sourceType}
            >
              <option value="">All source types</option>
              {sourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Ledger entries</h3>
          <span>{toMoney(statement.endingBalance)} ending balance</span>
        </div>

        {filteredEntries.length ? (
          <div className="resource-table">
            <div className="resource-table-head statement-grid">
              <span>Date</span>
              <span>Document</span>
              <span>Type</span>
              <span>Debit</span>
              <span>Credit</span>
              <span>Balance</span>
            </div>
            {filteredEntries.map((entry) => (
              <article className="resource-row statement-grid" key={entry.id}>
                <span>{entry.entryDate}</span>
                <div>
                  <strong>{getLedgerReference(entry)}</strong>
                  <span>{entry.notes || "No notes"}</span>
                </div>
                <span className="status-pill">{entry.sourceType}</span>
                <span>{getEntryDebit(entry) ? toMoney(getEntryDebit(entry)) : "-"}</span>
                <span>{getEntryCredit(entry) ? toMoney(getEntryCredit(entry)) : "-"}</span>
                <span>{toMoney(entry.runningBalance)}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-panel">No ledger entries match the current filters.</p>
        )}
      </section>
    </div>
  );
}

export default CustomerLedgerScreen;
