import { useCallback, useEffect, useState } from "react";
import {
  createPayment,
  getInvoice,
  getInvoicePrintDocument,
  listPayments,
  transitionInvoice
} from "../../services/invoiceApi.js";

const INVOICE_ACTIONS = [
  { action: "issue", label: "Issue", from: ["draft"], successTitle: "Invoice issued", successMessage: "Invoice issued.", tone: "primary" },
  { action: "void", label: "Void", from: ["issued"], successTitle: "Invoice voided", successMessage: "Invoice voided.", tone: "secondary" }
];
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingSkeleton,
  PageHeader,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentsPanel from "../attachments/AttachmentsPanel.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import {
  confirmDestructive,
  getBrandColor,
  getLogoUrl
} from "../system/settingsFormat.js";
import { formatCustomer } from "../transactions/transactionUtils.js";

const paymentMethods = ["cash", "card", "bank_transfer", "check", "other"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildInvoicePrintHtml(document, branding = {}) {
  const sections = document.sections || {};
  const vendor = sections.vendor || {};
  const customer = sections.customer || {};
  const header = sections.header || {};
  const totals = sections.totals || {};
  const items = sections.items || [];
  const logoUrl = branding.logoUrl || "";
  const brandColor = branding.brandColor || "#1f2621";
  const accentBorder = branding.brandColor || "#dbe4dd";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title || "Invoice")}</title>
    <style>
      body { margin: 0; padding: 32px; color: #1f2621; font-family: Inter, Arial, sans-serif; }
      header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid ${escapeHtml(accentBorder)}; padding-bottom: 20px; }
      .vendor-block { display: flex; gap: 16px; align-items: flex-start; }
      .vendor-logo { max-width: 120px; max-height: 80px; object-fit: contain; }
      h1 { margin: 0 0 8px; font-size: 28px; color: ${escapeHtml(brandColor)}; }
      h2 { margin: 0 0 8px; font-size: 16px; }
      p { margin: 3px 0; color: #647067; }
      section { margin-top: 24px; }
      .blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { padding: 10px; border-bottom: 1px solid #dbe4dd; text-align: left; }
      th { color: #647067; font-size: 12px; text-transform: uppercase; }
      .totals { margin-left: auto; width: min(320px, 100%); }
      .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
      .grand { font-weight: 700; border-top: 2px solid ${escapeHtml(accentBorder)}; margin-top: 6px; padding-top: 10px; }
      @media print { body { padding: 20px; } button { display: none; } }
    </style>
  </head>
  <body>
    <button onclick="window.print()">Print</button>
    <header>
      <div>
        <h1>${escapeHtml(document.title || "Invoice")}</h1>
        <p>Status: ${escapeHtml(header.status)}</p>
        <p>Issue date: ${escapeHtml(header.issueDate || "Not set")}</p>
        <p>Due date: ${escapeHtml(header.dueDate || "Not set")}</p>
      </div>
      <div class="vendor-block">
        ${
          logoUrl
            ? `<img class="vendor-logo" alt="" src="${escapeHtml(logoUrl)}" />`
            : ""
        }
        <div>
          <h2>${escapeHtml(vendor.displayName || vendor.legalName || "Vendor")}</h2>
          <p>${escapeHtml(vendor.contactEmail || "")}</p>
          <p>${escapeHtml(vendor.contactPhone || "")}</p>
        </div>
      </div>
    </header>
    <section class="blocks">
      <div>
        <h2>Bill to</h2>
        <p>${escapeHtml(customer.companyName || customer.fullName || "Customer")}</p>
        <p>${escapeHtml(customer.email || "")}</p>
        <p>${escapeHtml(customer.phone || "")}</p>
      </div>
      <div>
        <h2>Summary</h2>
        <p>Invoice number: ${escapeHtml(header.invoiceNumber)}</p>
        <p>Order: ${escapeHtml(header.order?.orderNumber || "Not linked")}</p>
      </div>
    </section>
    <section>
      <h2>Items</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `<tr>
                <td>${escapeHtml(item.productName || item.description || item.sku)}</td>
                <td>${escapeHtml(item.quantity)}</td>
                <td>${escapeHtml(toMoney(item.unitPrice))}</td>
                <td>${escapeHtml(toMoney(item.lineTotal))}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </section>
    <section class="totals">
      <div><span>Subtotal</span><strong>${escapeHtml(toMoney(totals.subtotal))}</strong></div>
      <div><span>Tax</span><strong>${escapeHtml(toMoney(totals.taxTotal))}</strong></div>
      <div><span>Discount</span><strong>${escapeHtml(toMoney(totals.discountTotal))}</strong></div>
      <div class="grand"><span>Total</span><strong>${escapeHtml(toMoney(totals.grandTotal))}</strong></div>
      <div><span>Balance due</span><strong>${escapeHtml(toMoney(totals.balanceDue))}</strong></div>
    </section>
    <section>
      <h2>Notes</h2>
      <p>${escapeHtml(sections.footer?.notes || "No notes.")}</p>
    </section>
  </body>
</html>`;
}

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function PaymentForm({ invoice, onPaid }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    amount: invoice.balanceDue || "",
    notes: "",
    paymentMethod: "bank_transfer",
    referenceNumber: ""
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const balanceDue = Number(invoice.balanceDue || 0);
  const isPayable = ["issued", "partially_paid"].includes(invoice.status) && balanceDue > 0;

  function updateField(field, value) {
    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: ""
      }));
    }

    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function validatePayment() {
    const nextErrors = {};
    const amount = Number(form.amount);

    if (!isPayable) {
      nextErrors.amount = "This invoice is not payable right now.";
    } else if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = "Enter a payment amount greater than 0.";
    } else if (amount > balanceDue) {
      nextErrors.amount = "Payment cannot exceed the outstanding balance.";
    }

    return nextErrors;
  }

  async function submitPayment(event) {
    event.preventDefault();

    const nextErrors = validatePayment();

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      await createPayment({
        amount: Number(form.amount),
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        notes: form.notes.trim() || null,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim() || null
      });

      showToast({
        message: "Payment was applied to the invoice.",
        title: "Payment recorded"
      });
      await onPaid();
      setForm({
        amount: "",
        notes: "",
        paymentMethod: "bank_transfer",
        referenceNumber: ""
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Payment could not be recorded.");

      showToast({
        message,
        title: "Payment failed",
        tone: "error"
      });
      setErrors({
        amount: message
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="payment-form" onSubmit={submitPayment}>
      <div className="panel-heading">
        <h3>Record payment</h3>
        <span>{isPayable ? `${toMoney(balanceDue)} outstanding` : "Not payable"}</span>
      </div>
      <div className="form-grid">
        <Field error={errors.amount} label="Amount">
          <input
            disabled={!isPayable}
            max={balanceDue || undefined}
            min="0.01"
            onChange={(event) => updateField("amount", event.target.value)}
            step="0.01"
            type="number"
            value={form.amount}
          />
        </Field>
        <Field label="Method">
          <select
            disabled={!isPayable}
            onChange={(event) => updateField("paymentMethod", event.target.value)}
            value={form.paymentMethod}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference">
          <input
            disabled={!isPayable}
            onChange={(event) => updateField("referenceNumber", event.target.value)}
            type="text"
            value={form.referenceNumber}
          />
        </Field>
        <Field label="Note">
          <textarea
            disabled={!isPayable}
            onChange={(event) => updateField("notes", event.target.value)}
            rows="3"
            value={form.notes}
          />
        </Field>
      </div>
      <div className="form-actions">
        <button className="primary-button" disabled={!isPayable || isSaving} type="submit">
          {isSaving ? "Recording..." : "Record payment"}
        </button>
      </div>
    </form>
  );
}

function InvoiceDetailScreen({ id, navigate }) {
  const { settings } = useAppSettings();
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  async function runLifecycleAction(spec) {
    if (!invoice || pendingAction) {
      return;
    }
    if (
      spec.action === "void" &&
      !confirmDestructive(settings, "Void this invoice? This cannot be undone.")
    ) {
      return;
    }
    setPendingAction(spec.action);
    try {
      const response = await transitionInvoice(invoice.id, spec.action);
      const next = response?.data;
      if (next) {
        setInvoice((current) => ({ ...current, ...next }));
      }
      showToast({
        message: spec.successMessage,
        title: spec.successTitle,
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, `${spec.label} action failed.`),
        title: `${spec.label} failed`,
        tone: "error"
      });
    } finally {
      setPendingAction("");
    }
  }

  const loadInvoice = useCallback(
    async ({ signal } = {}) => {
      const [invoiceResponse, paymentResponse] = await Promise.all([
        getInvoice(id, { signal }),
        listPayments({ invoiceId: id, page: 1, pageSize: 20 }, { signal })
      ]);

      setInvoice(invoiceResponse.data);
      setPayments(paymentResponse.data.items || []);
    },
    [id]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setInvoice(null);
    setPayments([]);
    setPendingAction("");

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        await loadInvoice({ signal: controller.signal });
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = getApiErrorMessage(requestError, "Invoice could not load.");

        setError(message);
        showToast({
          message,
          title: "Invoice unavailable",
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
  }, [loadInvoice, showToast]);

  if (isLoading) {
    return <LoadingSkeleton label="Loading invoice" rows={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadInvoice} />;
  }

  if (!invoice) {
    return <EmptyState>No invoice found.</EmptyState>;
  }

  const paidAmount = Number(invoice.grandTotal || 0) - Number(invoice.balanceDue || 0);

  async function openPrintView() {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showToast({
        message: "Allow popups for this site to open the printable invoice view.",
        title: "Print view blocked",
        tone: "error"
      });
      return;
    }

    printWindow.document.write("<p>Loading printable invoice...</p>");
    setIsPrinting(true);

    try {
      const response = await getInvoicePrintDocument(invoice.id);
      const html = buildInvoicePrintHtml(response.data, {
        brandColor: getBrandColor(settings),
        logoUrl: getLogoUrl(settings)
      });

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      showToast({
        message: "Printable invoice view opened. Use the browser print dialog to save as PDF.",
        title: "Print view ready"
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Printable invoice could not be loaded.");

      printWindow.close();
      showToast({
        message,
        title: "Print failed",
        tone: "error"
      });
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            {INVOICE_ACTIONS.map((spec) => {
              const enabled = spec.from.includes(invoice.status);
              const isBusy = pendingAction === spec.action;
              return (
                <button
                  className={spec.tone === "primary" ? "primary-button" : "secondary-button"}
                  disabled={!enabled || Boolean(pendingAction)}
                  key={spec.action}
                  onClick={() => runLifecycleAction(spec)}
                  title={
                    enabled
                      ? `${spec.label} this invoice`
                      : `${spec.label} is not available while status is "${invoice.status}".`
                  }
                  type="button"
                >
                  {isBusy ? `${spec.label}...` : spec.label}
                </button>
              );
            })}
            <button className="secondary-button" onClick={openPrintView} type="button">
              {isPrinting ? "Preparing..." : "Print / Download"}
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate("/invoices")}
              type="button"
            >
              Back to invoices
            </button>
          </div>
        }
        description={`Invoice for ${formatCustomer(invoice.customer)}.`}
        eyebrow="Invoice"
        title={invoice.invoiceNumber}
      />

      <section className="detail-grid">
        <DetailField label="Status" value={invoice.status} />
        <DetailField label="Customer" value={formatCustomer(invoice.customer)} />
        <DetailField label="Issue date" value={invoice.issueDate} />
        <DetailField label="Due date" value={invoice.dueDate} />
        <DetailField label="Subtotal" value={toMoney(invoice.subtotal)} />
        <DetailField
          label={
            invoice.discountType === "percent"
              ? `Discount (${Number(invoice.discountValue || 0)}%)`
              : "Discount"
          }
          value={
            Number(invoice.discountTotal || invoice.discountAmount || 0) > 0
              ? `- ${toMoney(invoice.discountTotal || invoice.discountAmount)}`
              : "None"
          }
        />
        <DetailField
          label={
            invoice.taxEnabled
              ? `Tax (${Number(invoice.taxRate || 0)}%)`
              : "Tax"
          }
          value={
            invoice.taxEnabled
              ? toMoney(invoice.taxTotal || invoice.taxAmount || 0)
              : "Not applied"
          }
        />
        <DetailField label="Grand total" value={toMoney(invoice.grandTotal)} />
        <DetailField label="Paid" value={toMoney(paidAmount)} />
        <DetailField label="Outstanding" value={toMoney(invoice.balanceDue)} />
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Line items</h3>
        </div>
        {invoice.items?.length ? (
          <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head detail-line-grid">
              <span>Product</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span>Total</span>
            </div>
            {invoice.items.map((item) => (
              <article className="resource-row detail-line-grid" key={item.id}>
                <div>
                  <strong>{item.product?.name || item.description}</strong>
                  <span>{item.product?.sku || item.description}</span>
                </div>
                <span>{item.quantity}</span>
                <span>{toMoney(item.unitPrice)}</span>
                <span>{toMoney(item.lineTotal)}</span>
              </article>
            ))}
          </div>
          </TableScroll>
        ) : (
          <EmptyState>No line items found.</EmptyState>
        )}
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Notes</h3>
        </div>
        <p className="muted">{invoice.notes || "No notes."}</p>
      </section>

      <section className="transaction-panel">
        <PaymentForm invoice={invoice} onPaid={() => loadInvoice()} />
      </section>

      <AttachmentsPanel entityType="invoices" entityId={invoice.id} />

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Payment history</h3>
          <span>{payments.length} payments</span>
        </div>
        {payments.length ? (
          <div className="record-list">
            {payments.map((payment) => (
              <article className="record-row" key={payment.id}>
                <div>
                  <strong>{toMoney(payment.amount)}</strong>
                  <span>{payment.referenceNumber || payment.paymentMethod || "Payment"}</span>
                </div>
                <div>
                  <span>{payment.paymentDate || payment.createdAt}</span>
                  <small>{payment.notes || "No note"}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No payments recorded for this invoice yet.</EmptyState>
        )}
      </section>
    </div>
  );
}

export default InvoiceDetailScreen;
