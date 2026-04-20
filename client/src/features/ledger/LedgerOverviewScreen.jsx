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
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import { getCustomerLabel, toMoney, toNumber } from "./ledgerUtils.js";

function summarizeInvoices(invoices) {
  return invoices.reduce(
    (summary, invoice) => {
      const total = toNumber(invoice.grandTotal);
      const outstanding = toNumber(invoice.balanceDue);

      return {
        invoiceTotal: summary.invoiceTotal + total,
        outstandingTotal: summary.outstandingTotal + outstanding,
        paidTotal: summary.paidTotal + Math.max(total - outstanding, 0)
      };
    },
    {
      invoiceTotal: 0,
      outstandingTotal: 0,
      paidTotal: 0
    }
  );
}

function LedgerOverviewScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [receivablesByCustomer, setReceivablesByCustomer] = useState({});
  const [isLoadingReceivables, setIsLoadingReceivables] = useState(false);
  const query = useMemo(
    () => ({
      page,
      pageSize,
      search,
      status: "active"
    }),
    [page, pageSize, search]
  );
  const loadCustomers = useCallback((params, options) => listCustomers(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Customer receivables could not be loaded."),
        title: "Ledger unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading } = useResourceDirectory(loadCustomers, query, {
    onError: handleListError
  });
  const customers = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    if (!customers.length) {
      setReceivablesByCustomer({});
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    async function loadReceivables() {
      setIsLoadingReceivables(true);

      try {
        const results = await Promise.all(
          customers.map(async (record) => {
            const response = await listInvoices(
              { customerId: record.customer.id, page: 1, pageSize: 100 },
              { signal: controller.signal }
            );

            return [record.customer.id, summarizeInvoices(response.data.items || [])];
          })
        );

        if (active) {
          setReceivablesByCustomer(Object.fromEntries(results));
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        showToast({
          message: getApiErrorMessage(requestError, "Receivable balances could not be loaded."),
          title: "Receivables unavailable",
          tone: "error"
        });
      } finally {
        if (active) {
          setIsLoadingReceivables(false);
        }
      }
    }

    loadReceivables();

    return () => {
      active = false;
      controller.abort();
    };
  }, [customers, showToast]);

  const rows = customers
    .map((record) => ({
      ...record,
      receivables: receivablesByCustomer[record.customer.id] || {
        invoiceTotal: 0,
        outstandingTotal: 0,
        paidTotal: 0
      }
    }))
    .filter((record) => !outstandingOnly || record.receivables.outstandingTotal > 0);
  const visibleSummary = rows.reduce(
    (summary, record) => ({
      invoiceTotal: summary.invoiceTotal + record.receivables.invoiceTotal,
      outstandingTotal: summary.outstandingTotal + record.receivables.outstandingTotal,
      paidTotal: summary.paidTotal + record.receivables.paidTotal
    }),
    {
      invoiceTotal: 0,
      outstandingTotal: 0,
      paidTotal: 0
    }
  );
  const hasFilters = Boolean(search || outstandingOnly);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  return (
    <div className="resource-page">
      <PageHeader
        description="Review customer receivables and open detailed customer statements."
        eyebrow="Ledger"
        title="Customer receivables"
      />

      <section className="metric-strip ledger-summary-strip">
        <article className="metric-tile">
          <span>Visible invoice total</span>
          <strong>{toMoney(visibleSummary.invoiceTotal)}</strong>
          <small>From invoices loaded for this customer page</small>
        </article>
        <article className="metric-tile">
          <span>Visible paid total</span>
          <strong>{toMoney(visibleSummary.paidTotal)}</strong>
          <small>Derived from invoice totals and balance due</small>
        </article>
        <article className="metric-tile">
          <span>Visible outstanding</span>
          <strong>{toMoney(visibleSummary.outstandingTotal)}</strong>
          <small>Current open receivables in this view</small>
        </article>
      </section>

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search customers"
          type="search"
          value={searchDraft}
        />
        <select
          onChange={(event) => {
            setOutstandingOnly(event.target.value === "outstanding");
            setPage(1);
          }}
          value={outstandingOnly ? "outstanding" : ""}
        >
          <option value="">All active customers</option>
          <option value="outstanding">Outstanding only</option>
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
      </Toolbar>

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading customer ledger...</p> : null}
      {isLoadingReceivables ? <p className="surface-message loading">Refreshing receivable balances...</p> : null}
      {!isLoading && !rows.length ? (
        <EmptyState>
          {hasFilters ? "No customers match the current ledger filters." : "No customer ledger records found."}
        </EmptyState>
      ) : null}

      {rows.length ? (
        <div className="resource-table">
          <div className="resource-table-head ledger-customer-grid">
            <span>Customer</span>
            <span>Invoice total</span>
            <span>Paid</span>
            <span>Outstanding</span>
            <span />
          </div>
          {rows.map((record) => (
            <article className="resource-row ledger-customer-grid" key={record.customer.id}>
              <div>
                <strong>{getCustomerLabel(record)}</strong>
                <span>{record.customer.email || record.customer.phone || record.relationship?.accountCode || "No contact"}</span>
              </div>
              <span>{toMoney(record.receivables.invoiceTotal)}</span>
              <span>{toMoney(record.receivables.paidTotal)}</span>
              <span>{toMoney(record.receivables.outstandingTotal)}</span>
              <button
                className="secondary-button compact"
                onClick={() => navigate(`/ledger/customers/${record.customer.id}`)}
                type="button"
              >
                Statement
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default LedgerOverviewScreen;
