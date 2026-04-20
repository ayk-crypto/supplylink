import { useCallback, useEffect, useState } from "react";
import {
  createPayment,
  getInvoice,
  getInvoicePrintDocument,
  listPayments
} from "../../services/invoiceApi.js";
import { Field, PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
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

function buildInvoicePrintHtml(document) {
  const sections = document.sections || {};
  const vendor = sections.vendor || {};
  const customer = sections.customer || {};
  const header = sections.header || {};
  const totals = sections.totals || {};
  const items = sections.items || [];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title || "Invoice")}</title>
    <style>
      body { margin: 0; padding: 32px; color: #1f2621; font-family: Inter, Arial, sans-serif; }
      header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #dbe4dd; padding-bottom: 20px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      h2 { margin: 0 0 8px; font-size: 16px; }
      p { margin: 3px 0; color: #647067; }
      section { margin-top: 24px; }
      .blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { padding: 10px; border-bottom: 1px solid #dbe4dd; text-align: left; }
      th { color: #647067; font-size: 12px; text-transform: uppercase; }
      .totals { margin-left: auto; width: min(320px, 100%); }
      .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
      .grand { font-weight: 700; border-top: 1px solid #dbe4dd; margin-top: 6px; padding-top: 10px; }
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
      <div>
        <h2>${escapeHtml(vendor.displayName || vendor.legalName || "Vendor")}</h2>
        <p>${escapeHtml(vendor.contactEmail || "")}</p>
        <p>${escapeHtml(vendor.contactPhone || "")}</p>
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
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

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
    return <p className="surface-message loading">Loading invoice...</p>;
  }

  if (error) {
    return <p className="surface-message error">{error}</p>;
  }

  if (!invoice) {
    return <p className="surface-message">No invoice found.</p>;
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
      const html = buildInvoicePrintHtml(response.data);

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
        <DetailField label="Total" value={toMoney(invoice.grandTotal)} />
        <DetailField label="Paid" value={toMoney(paidAmount)} />
        <DetailField label="Outstanding" value={toMoney(invoice.balanceDue)} />
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Line items</h3>
        </div>
        {invoice.items?.length ? (
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
        ) : (
          <p className="empty-panel">No line items found.</p>
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
          <p className="empty-panel">No payments recorded for this invoice yet.</p>
        )}
      </section>
    </div>
  );
}

export default InvoiceDetailScreen;
