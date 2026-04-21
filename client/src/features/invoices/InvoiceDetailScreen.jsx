import { useCallback, useEffect, useState } from "react";
import {
  createPayment,
  downloadInvoicePdf,
  getInvoice,
  getInvoicePrintDocument,
  listPayments,
  transitionInvoice
} from "../../services/invoiceApi.js";
import { shareInvoice } from "../../services/documentShareApi.js";
import { sendInvoiceEmail } from "../../services/documentEmailApi.js";

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
  formatDateTimeWith,
  formatDateWith,
  formatMoneyWith
} from "../system/settingsFormat.js";
import { formatCustomer } from "../transactions/transactionUtils.js";
import DocumentPreviewModal from "../documents/DocumentPreviewModal.jsx";
import DocumentShareModal from "../documents/DocumentShareModal.jsx";
import DocumentEmailModal from "../documents/DocumentEmailModal.jsx";
import DocumentHeroPanel from "../documents/DocumentHeroPanel.jsx";
import DocumentTotalsCard from "../documents/DocumentTotalsCard.jsx";
import DocumentActionBar from "../documents/DocumentActionBar.jsx";
import {
  copyTextToClipboard,
  downloadBlobFile,
  getDownloadFilename,
  openDocumentPrintWindow
} from "../documents/documentUtils.js";

const paymentMethods = ["cash", "card", "bank_transfer", "check", "other"];

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
  const [previewDocument, setPreviewDocument] = useState(null);
  const [shareDetails, setShareDetails] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");

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
      setShareDetails(invoiceResponse.data?.sharing || null);
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

  async function loadInvoiceDocument() {
    setIsPrinting(true);

    try {
      const response = await getInvoicePrintDocument(invoice.id);
      return response.data;
    } finally {
      setIsPrinting(false);
    }
  }

  async function openInvoicePreview() {
    try {
      const document = await loadInvoiceDocument();
      setPreviewDocument(document);
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Invoice preview could not be loaded."),
        title: "Preview unavailable",
        tone: "error"
      });
    }
  }

  async function openPrintView() {
    try {
      const document = previewDocument || (await loadInvoiceDocument());
      if (!previewDocument) {
        setPreviewDocument(document);
      }
      openDocumentPrintWindow(document, settings);
      showToast({
        message: "Printable invoice view opened.",
        title: "Print view ready"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Printable invoice could not be loaded."),
        title: "Print failed",
        tone: "error"
      });
    }
  }

  async function downloadInvoiceDocument() {
    try {
      const response = await downloadInvoicePdf(invoice.id);
      downloadBlobFile(
        response.data,
        getDownloadFilename(response.headers?.contentDisposition, `invoice-${invoice.id}.pdf`)
      );
      showToast({
        message: "Invoice PDF downloaded.",
        title: "Download started"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Invoice PDF could not be downloaded."),
        title: "Download failed",
        tone: "error"
      });
    }
  }

  async function openShareModal() {
    setIsShareOpen(true);
    if (isShareLoading) {
      return;
    }

    setIsShareLoading(true);

    try {
      const response = await shareInvoice(invoice.id);
      setShareDetails(response.data);
      setInvoice((current) => (current ? { ...current, sharing: response.data } : current));
    } catch (requestError) {
      setIsShareOpen(false);
      showToast({
        message: getApiErrorMessage(requestError, "Share link could not be prepared."),
        title: "Share unavailable",
        tone: "error"
      });
    } finally {
      setIsShareLoading(false);
    }
  }

  function getDefaultEmailSubject() {
    return `Invoice ${invoice.invoiceNumber} from ${
      settings.company?.displayName || settings.company?.legalName || "SupplyLink"
    }`;
  }

  function getDefaultEmailMessage() {
    const customerName = formatCustomer(invoice.customer);
    const dueDate = invoice.dueDate ? formatDateWith(settings, invoice.dueDate) : "";

    return [
      `Hello ${customerName},`,
      "",
      `Please find invoice ${invoice.invoiceNumber} attached as a PDF.`,
      `Balance due: ${formatMoneyWith(settings, invoice.balanceDue)}`,
      dueDate ? `Due date: ${dueDate}` : "",
      "",
      "You can also open the secure online version using the included share link.",
      "",
      "Regards,"
    ]
      .filter(Boolean)
      .join("\n");
  }

  function openEmailModal() {
    setEmailError("");
    setIsEmailOpen(true);
  }

  async function submitEmail(payload) {
    setIsEmailSending(true);
    setEmailError("");

    try {
      const response = await sendInvoiceEmail(invoice.id, payload);
      if (response.data?.share) {
        setShareDetails(response.data.share);
        setInvoice((current) => (current ? { ...current, sharing: response.data.share } : current));
      }
      setIsEmailOpen(false);
      showToast({
        message: `Invoice emailed to ${response.data.recipientEmail}.`,
        title: "Email sent",
        tone: "success"
      });
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Invoice email could not be sent.");
      setEmailError(message);
    } finally {
      setIsEmailSending(false);
    }
  }

  async function copyShareLink() {
    if (!shareDetails?.publicUrl) {
      return;
    }

    try {
      await copyTextToClipboard(shareDetails.publicUrl);
      showToast({
        message: "Secure share link copied.",
        title: "Link copied"
      });
    } catch (requestError) {
      showToast({
        message: "Copy failed. Open the preview and copy the URL manually.",
        title: "Copy unavailable",
        tone: "error"
      });
      void requestError;
    }
  }

  function openSharedPreview() {
    if (!shareDetails?.publicUrl) {
      return;
    }

    window.open(shareDetails.publicUrl, "_blank", "noopener,noreferrer");
  }

  const balanceDueAmount = Number(invoice.balanceDue || 0);
  const isOutstanding = balanceDueAmount > 0 && invoice.status !== "void";
  const isPaidInFull =
    balanceDueAmount <= 0 && Number(invoice.grandTotal || 0) > 0 && invoice.status !== "draft";
  const highlight = isOutstanding
    ? {
        label: "Balance due",
        value: formatMoneyWith(settings, invoice.balanceDue),
        tone: "warning",
        note: invoice.dueDate ? `Due ${formatDateWith(settings, invoice.dueDate)}` : null
      }
    : isPaidInFull
      ? {
          label: "Paid in full",
          value: toMoney(invoice.grandTotal),
          tone: "success"
        }
      : {
          label: "Grand total",
          value: toMoney(invoice.grandTotal),
          tone: "primary"
        };

  const invoiceDiscount = Number(invoice.discountTotal || invoice.discountAmount || 0);
  const invoiceTax = Number(invoice.taxTotal || invoice.taxAmount || 0);
  const totalsRows = [
    { label: "Subtotal", value: toMoney(invoice.subtotal) },
    invoiceDiscount > 0
      ? {
          label:
            invoice.discountType === "percent"
              ? `Discount (${Number(invoice.discountValue || 0)}%)`
              : "Discount",
          value: `- ${toMoney(invoiceDiscount)}`,
          tone: "negative"
        }
      : null,
    invoice.taxEnabled
      ? {
          label: `Tax (${Number(invoice.taxRate || 0)}%)`,
          value: toMoney(invoiceTax)
        }
      : null
  ];
  const totalsFooter = [
    { label: "Paid", value: toMoney(paidAmount), tone: "success" },
    {
      label: "Outstanding",
      value: formatMoneyWith(settings, invoice.balanceDue),
      tone: balanceDueAmount > 0 ? "warning" : "neutral"
    }
  ];

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="doc-toolbar">
            <DocumentActionBar
              extras={
                <div className="button-row">
                  <button
                    className="secondary-button doc-action-bar-button"
                    onClick={openEmailModal}
                    type="button"
                  >
                    Send email
                  </button>
                  <button
                    className="secondary-button doc-action-bar-button"
                    onClick={openShareModal}
                    type="button"
                  >
                    Send link
                  </button>
                </div>
              }
              isBusy={isPrinting}
              onDownload={downloadInvoiceDocument}
              onPreview={openInvoicePreview}
              onPrint={openPrintView}
            />
            <div className="button-row doc-toolbar-lifecycle">
              {INVOICE_ACTIONS.map((spec) => {
                const enabled = spec.from.includes(invoice.status);
                const isBusy = pendingAction === spec.action;
                return (
                  <button
                    className={
                      spec.tone === "primary" ? "primary-button" : "secondary-button"
                    }
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
              <button
                className="secondary-button"
                onClick={() => navigate("/invoices")}
                type="button"
              >
                Back to invoices
              </button>
            </div>
          </div>
        }
        description={`Invoice for ${formatCustomer(invoice.customer)}.`}
        eyebrow="Invoice"
        title={invoice.invoiceNumber}
      />

      <DocumentHeroPanel
        eyebrow="Invoice"
        number={invoice.invoiceNumber}
        description={`Issued for ${formatCustomer(invoice.customer)}`}
        statusKind="invoice"
        status={invoice.status}
        highlight={highlight}
        meta={[
          { label: "Customer", value: formatCustomer(invoice.customer) },
          {
            label: "Issue date",
            value: invoice.issueDate ? formatDateWith(settings, invoice.issueDate) : "—"
          },
          {
            label: "Due date",
            value: invoice.dueDate ? formatDateWith(settings, invoice.dueDate) : "—"
          },
          { label: "Grand total", value: toMoney(invoice.grandTotal) }
        ]}
      />

      <section className="doc-body-grid">
        <section className="transaction-panel doc-body-main">
          <div className="panel-heading">
            <h3>Line items</h3>
            <span>{invoice.items?.length || 0} items</span>
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
        <DocumentTotalsCard
          rows={totalsRows}
          grand={{ label: "Grand total", value: toMoney(invoice.grandTotal) }}
          footer={totalsFooter}
        />
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
                  <span>
                    {payment.paymentDate
                      ? formatDateWith(settings, payment.paymentDate)
                      : formatDateTimeWith(settings, payment.createdAt)}
                  </span>
                  <small>{payment.notes || "No note"}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No payments recorded for this invoice yet.</EmptyState>
        )}
      </section>

      {previewDocument ? (
        <DocumentPreviewModal
          document={previewDocument}
          isLoading={isPrinting}
          onClose={() => setPreviewDocument(null)}
          onDownload={downloadInvoiceDocument}
          onPrint={openPrintView}
          settings={settings}
        />
      ) : null}

      {isShareOpen ? (
        <DocumentShareModal
          isLoading={isShareLoading}
          onClose={() => setIsShareOpen(false)}
          onCopy={copyShareLink}
          onOpen={openSharedPreview}
          share={shareDetails}
        />
      ) : null}

      {isEmailOpen ? (
        <DocumentEmailModal
          customerEmail={invoice.customer?.email || ""}
          defaultMessageBody={getDefaultEmailMessage()}
          defaultSubject={getDefaultEmailSubject()}
          documentLabel="invoice"
          error={emailError}
          isLoading={isEmailSending}
          onClose={() => {
            if (!isEmailSending) {
              setIsEmailOpen(false);
              setEmailError("");
            }
          }}
          onSubmit={submitEmail}
        />
      ) : null}
    </div>
  );
}

export default InvoiceDetailScreen;
