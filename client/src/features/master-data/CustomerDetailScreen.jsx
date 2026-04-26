import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentsPanel from "../attachments/AttachmentsPanel.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getCustomer, updateCustomer } from "../../services/masterDataApi.js";
import { listOrders, listQuotations } from "../../services/transactionApi.js";
import { listInvoices } from "../../services/invoiceApi.js";
import { getCustomerLedger } from "../../services/ledgerApi.js";
import { listPaymentReport } from "../../services/reportApi.js";
import { getEntityAuditHistory } from "../../services/auditApi.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateTimeWith, formatDateWith } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import Avatar from "../../components/ui/Avatar.jsx";
import {
  actorDisplayLabel,
  eventLabelOf,
  formatMetadataSummary
} from "../audit/auditUtils.js";
import CustomerForm from "./CustomerForm.jsx";
import { getApiErrorMessage, toMoney } from "./resourceUtils.js";

function DetailField({ label, value, wide }) {
  return (
    <div className={wide ? "detail-field detail-field-wide-2" : "detail-field"}>
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function useAsyncSection(loader, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setIsLoading(true);
    setError("");

    loader({ signal: controller.signal })
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((requestError) => {
        if (!active || requestError.name === "AbortError") {
          return;
        }
        setError(getApiErrorMessage(requestError, "This section could not load."));
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  return { data, error, isLoading, reload };
}

function SectionShell({ children, isLoading, error, onRetry, isEmpty, emptyLabel }) {
  if (isLoading) {
    return <LoadingSkeleton rows={3} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (isEmpty) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }
  return children;
}

function OverviewTiles({ invoiceSummary, ledgerSummary }) {
  return (
    <div className="metric-strip">
      <article className="metric-tile">
        <span>Invoices on file</span>
        <strong>{invoiceSummary.totalCount ?? "—"}</strong>
        <small>
          {invoiceSummary.totalCount
            ? `Showing the most recent ${invoiceSummary.sampledCount}`
            : "No invoices yet"}
        </small>
      </article>
      <article className="metric-tile">
        <span>Outstanding</span>
        <strong>{toMoney(invoiceSummary.outstanding || 0)}</strong>
        <small>Across the recent invoices shown</small>
      </article>
      <article className="metric-tile">
        <span>Invoiced</span>
        <strong>{toMoney(invoiceSummary.grandTotal || 0)}</strong>
        <small>Across the recent invoices shown</small>
      </article>
      <article className="metric-tile">
        <span>Ledger ending balance</span>
        <strong>
          {ledgerSummary.endingBalance != null
            ? toMoney(ledgerSummary.endingBalance)
            : "—"}
        </strong>
        <small>{ledgerSummary.entryCount} ledger entries</small>
      </article>
    </div>
  );
}

function CustomerDetailScreen({ id, navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const [isEditing, setIsEditing] = useState(false);

  const customerSection = useAsyncSection(
    ({ signal }) => getCustomer(id, { signal }).then((response) => response.data),
    [id]
  );
  const invoicesSection = useAsyncSection(
    ({ signal }) =>
      listInvoices({ customerId: id, page: 1, pageSize: 100 }, { signal }).then(
        (response) => response.data
      ),
    [id]
  );
  const ordersSection = useAsyncSection(
    ({ signal }) =>
      listOrders({ customerId: id, page: 1, pageSize: 5 }, { signal }).then(
        (response) => response.data
      ),
    [id]
  );
  const quotationsSection = useAsyncSection(
    ({ signal }) =>
      listQuotations({ customerId: id, page: 1, pageSize: 5 }, { signal }).then(
        (response) => response.data
      ),
    [id]
  );
  const paymentsSection = useAsyncSection(
    ({ signal }) =>
      listPaymentReport({ customerId: id, page: 1, pageSize: 5 }, { signal }).then(
        (response) => response.data
      ),
    [id]
  );
  const ledgerSection = useAsyncSection(
    ({ signal }) =>
      getCustomerLedger(id, { signal }).then((response) => response.data),
    [id]
  );
  const auditSection = useAsyncSection(
    ({ signal }) =>
      getEntityAuditHistory(
        "customers",
        id,
        { page: 1, pageSize: 10 },
        { signal }
      ).then((response) => response.data),
    [id]
  );

  const record = customerSection.data;
  const customer = record?.customer || null;
  const relationship = record?.relationship || null;

  const invoiceItems = useMemo(
    () => invoicesSection.data?.items || [],
    [invoicesSection.data]
  );
  const invoicePagination = invoicesSection.data?.pagination || null;
  const invoiceSummary = useMemo(() => {
    if (!invoiceItems.length) {
      return {
        totalCount: invoicePagination?.total ?? 0,
        sampledCount: 0,
        grandTotal: 0,
        outstanding: 0
      };
    }
    return invoiceItems.reduce(
      (acc, invoice) => ({
        totalCount: invoicePagination?.total ?? invoiceItems.length,
        sampledCount: invoiceItems.length,
        grandTotal: acc.grandTotal + Number(invoice.grandTotal || 0),
        outstanding: acc.outstanding + Number(invoice.balanceDue || 0)
      }),
      { totalCount: 0, sampledCount: 0, grandTotal: 0, outstanding: 0 }
    );
  }, [invoiceItems, invoicePagination]);

  const ledgerSummary = useMemo(() => {
    const items = ledgerSection.data?.items || [];
    return {
      endingBalance:
        ledgerSection.data && ledgerSection.data.endingBalance != null
          ? Number(ledgerSection.data.endingBalance)
          : null,
      entryCount: items.length
    };
  }, [ledgerSection.data]);

  async function handleSave(payload) {
    await updateCustomer(id, payload);
    showToast({
      message: "Customer changes were saved.",
      title: "Customer updated"
    });
    setIsEditing(false);
    customerSection.reload();
  }

  if (customerSection.isLoading) {
    return <LoadingSkeleton label="Loading customer" rows={5} />;
  }

  if (customerSection.error) {
    return <ErrorState message={customerSection.error} onRetry={customerSection.reload} />;
  }

  if (!customer) {
    return (
      <div className="resource-page">
        <PageHeader
          eyebrow="Customer"
          title="Customer Not Found"
          description="The customer record could not be loaded."
          action={
            <button
              className="secondary-button"
              onClick={() => navigate("/customers")}
              type="button"
            >
              Back to customers
            </button>
          }
        />
      </div>
    );
  }

  const recentInvoices = invoiceItems.slice(0, 5);
  const recentOrders = ordersSection.data?.items || [];
  const recentQuotations = quotationsSection.data?.items || [];
  const recentPayments = paymentsSection.data?.items || [];
  const auditItems = auditSection.data?.items || [];

  const displayName = customer.fullName || customer.companyName || "Customer";
  const balance = ledgerSummary.endingBalance;
  const balanceTone =
    balance == null ? "neutral" : balance > 0 ? "danger" : balance < 0 ? "info" : "success";

  return (
    <div className="resource-page">
      <header className={`customer-summary-card balance-tone-${balanceTone}`}>
        <div className="customer-summary-identity">
          <Avatar name={displayName} seed={customer.id} size="lg" />
          <div className="customer-summary-text">
            <p className="eyebrow">Customer</p>
            <h1>{displayName}</h1>
            <div className="customer-summary-chips">
              <StatusPill kind="relationship" status={relationship?.status || "active"} />
              {relationship?.accountCode ? (
                <span className="meta-chip">Code · {relationship.accountCode}</span>
              ) : null}
              {customer.companyName && customer.fullName ? (
                <span className="meta-chip">{customer.companyName}</span>
              ) : null}
            </div>
            <ul className="customer-summary-contacts">
              {customer.email ? (
                <li>
                  <span aria-hidden="true">✉</span>
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </li>
              ) : null}
              {customer.phone ? (
                <li>
                  <span aria-hidden="true">☏</span>
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                </li>
              ) : null}
              {!customer.email && !customer.phone ? (
                <li className="muted">No contact details on file.</li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="customer-summary-balance">
          <span className="customer-summary-balance-label">Ledger balance</span>
          <strong className="customer-summary-balance-value">
            {balance != null ? toMoney(balance) : "—"}
          </strong>
          <small>
            {balance == null
              ? "No ledger activity"
              : balance > 0
                ? "Customer owes"
                : balance < 0
                  ? "Credit on account"
                  : "Settled in full"}
          </small>
          <div className="button-row customer-summary-actions">
            <button
              className="secondary-button compact"
              onClick={() => navigate("/customers")}
              type="button"
            >
              Back
            </button>
            <button
              className="secondary-button compact"
              onClick={() => navigate(`/ledger/customers/${id}`)}
              type="button"
            >
              Statement
            </button>
            <button
              className="secondary-button compact"
              onClick={() => navigate(`/audit/customers/${id}`)}
              type="button"
            >
              Audit
            </button>
            <button
              className="primary-button compact"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Edit
            </button>
          </div>
        </div>
      </header>

      <SectionHeader title="Overview" hint="Profile, contact details, and account snapshot." />
      <section className="detail-grid">
        <DetailField label="Full name" value={customer.fullName} />
        <DetailField label="Company" value={customer.companyName} />
        <DetailField label="Email" value={customer.email} wide />
        <DetailField label="Phone" value={customer.phone} />
        <DetailField label="Account code" value={relationship?.accountCode} />
        <div className="detail-field">
          <span>Relationship status</span>
          <strong>
            <StatusPill
              kind="relationship"
              status={relationship?.status || "active"}
            />
          </strong>
        </div>
      </section>
      {relationship?.notes ? (
        <p className="surface-message">{relationship.notes}</p>
      ) : null}
      <SectionShell
        isLoading={invoicesSection.isLoading || ledgerSection.isLoading}
        error={invoicesSection.error || ledgerSection.error}
        onRetry={() => {
          invoicesSection.reload();
          ledgerSection.reload();
        }}
        isEmpty={false}
      >
        <OverviewTiles invoiceSummary={invoiceSummary} ledgerSummary={ledgerSummary} />
      </SectionShell>

      <SectionHeader
        title="Ledger"
        hint={
          ledgerSummary.endingBalance != null
            ? `Ending balance ${toMoney(ledgerSummary.endingBalance)}`
            : "Statement-style receivables history"
        }
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate(`/ledger/customers/${id}`)}
            type="button"
          >
            Open full statement
          </button>
        }
      />
      <SectionShell
        isLoading={ledgerSection.isLoading}
        error={ledgerSection.error}
        onRetry={ledgerSection.reload}
        isEmpty={!ledgerSection.data?.items?.length}
        emptyLabel="No ledger entries yet."
      >
        <p className="surface-message">
          {ledgerSection.data?.items?.length || 0} ledger entries on file. Use the
          full statement for filters, totals, and CSV export.
        </p>
      </SectionShell>

      <SectionHeader
        title="Recent Orders"
        hint={
          ordersSection.data?.pagination?.total
            ? `${ordersSection.data.pagination.total} on file`
            : "Latest five orders"
        }
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate("/orders")}
            type="button"
          >
            View all
          </button>
        }
      />
      <SectionShell
        isLoading={ordersSection.isLoading}
        error={ordersSection.error}
        onRetry={ordersSection.reload}
        isEmpty={!recentOrders.length}
        emptyLabel="No orders for this customer yet."
      >
        <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head report-order-grid">
              <span>Order</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Date</span>
              <span>Total</span>
            </div>
            {recentOrders.map((order) => (
              <article className="resource-row report-order-grid" key={order.id}>
                <button
                  className="link-button"
                  onClick={() => navigate(`/orders/${order.id}`)}
                  type="button"
                >
                  {order.orderNumber || order.id}
                </button>
                <span>{customer.fullName}</span>
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
      </SectionShell>

      <SectionHeader
        title="Recent Quotations"
        hint={
          quotationsSection.data?.pagination?.total
            ? `${quotationsSection.data.pagination.total} on file`
            : "Latest five quotations"
        }
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate("/quotations")}
            type="button"
          >
            View all
          </button>
        }
      />
      <SectionShell
        isLoading={quotationsSection.isLoading}
        error={quotationsSection.error}
        onRetry={quotationsSection.reload}
        isEmpty={!recentQuotations.length}
        emptyLabel="No quotations for this customer yet."
      >
        <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head report-order-grid">
              <span>Quotation</span>
              <span>Customer</span>
              <span>Status</span>
              <span>Date</span>
              <span>Total</span>
            </div>
            {recentQuotations.map((quotation) => (
              <article className="resource-row report-order-grid" key={quotation.id}>
                <button
                  className="link-button"
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                  type="button"
                >
                  {quotation.quoteNumber || quotation.id}
                </button>
                <span>{customer.fullName}</span>
                <StatusPill kind="quotation" status={quotation.status} />
                <div>
                  <strong>{formatDateWith(settings, quotation.issueDate || quotation.createdAt)}</strong>
                  <span>{quotation.expiryDate ? formatDateWith(settings, quotation.expiryDate) : "No expiry"}</span>
                </div>
                <span>{toMoney(quotation.grandTotal)}</span>
              </article>
            ))}
          </div>
        </TableScroll>
      </SectionShell>

      <SectionHeader
        title="Recent Invoices"
        hint={
          invoicePagination?.total
            ? `${invoicePagination.total} on file`
            : "Latest five invoices"
        }
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate("/invoices")}
            type="button"
          >
            View all
          </button>
        }
      />
      <SectionShell
        isLoading={invoicesSection.isLoading}
        error={invoicesSection.error}
        onRetry={invoicesSection.reload}
        isEmpty={!recentInvoices.length}
        emptyLabel="No invoices for this customer yet."
      >
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
            {recentInvoices.map((invoice) => {
              const paid =
                Number(invoice.grandTotal || 0) - Number(invoice.balanceDue || 0);
              return (
                <article className="resource-row report-invoice-grid" key={invoice.id}>
                  <button
                    className="link-button"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                    type="button"
                  >
                    {invoice.invoiceNumber || invoice.id}
                  </button>
                  <span>{customer.fullName}</span>
                  <StatusPill kind="invoice" status={invoice.status} />
                  <div>
                    <strong>{invoice.issueDate ? formatDateWith(settings, invoice.issueDate) : "No issue date"}</strong>
                    <span>{invoice.dueDate ? formatDateWith(settings, invoice.dueDate) : "No due date"}</span>
                  </div>
                  <span>{toMoney(invoice.grandTotal)}</span>
                  <span>{toMoney(paid)}</span>
                  <span>{toMoney(invoice.balanceDue)}</span>
                </article>
              );
            })}
          </div>
        </TableScroll>
      </SectionShell>

      <SectionHeader
        title="Recent Payments"
        hint={
          paymentsSection.data?.pagination?.total
            ? `${paymentsSection.data.pagination.total} on file`
            : "Latest five payments"
        }
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate("/reports/payments")}
            type="button"
          >
            Open payments report
          </button>
        }
      />
      <SectionShell
        isLoading={paymentsSection.isLoading}
        error={paymentsSection.error}
        onRetry={paymentsSection.reload}
        isEmpty={!recentPayments.length}
        emptyLabel="No payments for this customer yet."
      >
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
            {recentPayments.map((payment) => (
              <article className="resource-row report-payment-grid" key={payment.id}>
                <span>{formatDateWith(settings, payment.paymentDate || payment.createdAt)}</span>
                <span>{customer.fullName}</span>
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
      </SectionShell>

      <SectionHeader title="Attachments" hint="Files linked to this customer." />
      <AttachmentsPanel entityType="customers" entityId={id} />

      <SectionHeader
        title="Recent Activity"
        hint="Audit trail for this customer record."
        action={
          <button
            className="secondary-button compact"
            onClick={() => navigate(`/audit/customers/${id}`)}
            type="button"
          >
            View full history
          </button>
        }
      />
      <SectionShell
        isLoading={auditSection.isLoading}
        error={auditSection.error}
        onRetry={auditSection.reload}
        isEmpty={!auditItems.length}
        emptyLabel="No audit events recorded for this customer yet."
      >
        <div className="audit-list">
          {auditItems.map((event) => {
            const metaSummary = formatMetadataSummary(event.metadata);
            const actorLabel = actorDisplayLabel(event);
            return (
              <article className="audit-card" key={event.id}>
                <header className="audit-card-head">
                  <div className="audit-card-title">
                    <strong>{eventLabelOf(event)}</strong>
                    {event.eventType && event.eventType !== eventLabelOf(event) ? (
                      <span className="audit-event-code">{event.eventType}</span>
                    ) : null}
                  </div>
                  <time dateTime={event.createdAt || undefined}>
                    {formatDateTimeWith(settings, event.createdAt)}
                  </time>
                </header>
                <p className="audit-summary">
                  by <strong title={event.actorUserId || ""}>{actorLabel}</strong>
                </p>
                {metaSummary ? (
                  <p className="audit-detail-line">{metaSummary}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionShell>

      {isEditing ? (
        <CustomerForm
          mode="edit"
          onCancel={() => setIsEditing(false)}
          onSave={handleSave}
          record={record}
        />
      ) : null}
    </div>
  );
}

export default CustomerDetailScreen;
