import { useEffect, useState } from "react";
import {
  convertQuotationToOrder,
  getOrder,
  getQuotationPrintDocument,
  getQuotation,
  transitionOrder,
  transitionQuotation
} from "../../services/transactionApi.js";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentsPanel from "../attachments/AttachmentsPanel.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { confirmDestructive, formatDateWith } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { formatCustomer } from "./transactionUtils.js";
import DocumentPreviewModal from "../documents/DocumentPreviewModal.jsx";
import { downloadDocumentHtml, openDocumentPrintWindow } from "../documents/documentUtils.js";

const QUOTATION_ACTIONS = [
  { action: "send", label: "Send", from: ["draft"], successTitle: "Quotation sent", successMessage: "Quotation marked as sent." },
  { action: "accept", label: "Accept", from: ["sent"], successTitle: "Quotation accepted", successMessage: "Quotation accepted." },
  { action: "reject", label: "Reject", from: ["sent"], successTitle: "Quotation rejected", successMessage: "Quotation rejected." },
  { action: "expire", label: "Expire", from: ["sent"], successTitle: "Quotation expired", successMessage: "Quotation marked as expired." }
];

const ORDER_ACTIONS = [
  { action: "confirm", label: "Confirm", from: ["draft"], successTitle: "Order confirmed", successMessage: "Order confirmed." },
  { action: "pack", label: "Pack", from: ["confirmed"], successTitle: "Order packed", successMessage: "Order marked as packed." },
  { action: "dispatch", label: "Dispatch", from: ["packed"], successTitle: "Order dispatched", successMessage: "Order marked as dispatched." },
  { action: "deliver", label: "Deliver", from: ["dispatched"], successTitle: "Order delivered", successMessage: "Order marked as delivered." },
  { action: "cancel", label: "Cancel", from: ["draft", "confirmed", "packed"], successTitle: "Order cancelled", successMessage: "Order cancelled." }
];

const configs = {
  orders: {
    get: getOrder,
    listPath: "/orders",
    numberKey: "orderNumber",
    title: "Order",
    actions: ORDER_ACTIONS,
    transition: transitionOrder
  },
  quotations: {
    get: getQuotation,
    listPath: "/quotations",
    numberKey: "quoteNumber",
    title: "Quotation",
    actions: QUOTATION_ACTIONS,
    transition: transitionQuotation
  }
};

function describeReason(actionLabel, currentStatus) {
  return `${actionLabel} is not available while status is "${currentStatus}".`;
}

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function TransactionDetailScreen({ id, kind, navigate }) {
  const { settings } = useAppSettings();
  const config = configs[kind];
  const { showToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [previewDocument, setPreviewDocument] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  async function runLifecycleAction(spec) {
    if (!detail || pendingAction) {
      return;
    }
    if (spec.action === "cancel" || spec.action === "reject") {
      const message =
        spec.action === "cancel"
          ? "Cancel this order? This cannot be undone."
          : "Reject this quotation? This cannot be undone.";
      if (!confirmDestructive(settings, message)) {
        return;
      }
    }
    setPendingAction(spec.action);
    try {
      const response = await config.transition(detail.id, spec.action);
      const next = response?.data;
      if (next) {
        setDetail((current) => ({ ...current, ...next }));
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

  async function handleConvertToOrder() {
    if (!detail || isConverting) {
      return;
    }
    setIsConverting(true);
    try {
      const response = await convertQuotationToOrder(detail.id);
      const newOrder = response?.data?.order || response?.data;
      const orderNumber = newOrder?.orderNumber ? ` ${newOrder.orderNumber}` : "";
      showToast({
        message: `Quotation ${detail.quoteNumber || ""} became order${orderNumber}.`.trim(),
        title: "Converted to order",
        tone: "success"
      });
      if (newOrder?.id) {
        navigate(`/orders/${newOrder.id}`);
      } else {
        navigate("/orders");
      }
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Quotation could not be converted to an order."
        ),
        title: "Conversion failed",
        tone: "error"
      });
    } finally {
      setIsConverting(false);
    }
  }

  async function loadQuotationDocument() {
    setIsPreviewLoading(true);

    try {
      const response = await getQuotationPrintDocument(id);
      return response.data;
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function openQuotationPreview() {
    try {
      const document = await loadQuotationDocument();
      setPreviewDocument(document);
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Quotation preview could not be loaded."),
        title: "Preview unavailable",
        tone: "error"
      });
    }
  }

  async function handleQuotationPrint() {
    try {
      const document = previewDocument || (await loadQuotationDocument());
      if (!previewDocument) {
        setPreviewDocument(document);
      }
      openDocumentPrintWindow(document, settings);
      showToast({
        message: "Printable quotation view opened.",
        title: "Print view ready"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Printable quotation could not be loaded."),
        title: "Print failed",
        tone: "error"
      });
    }
  }

  async function handleQuotationDownload() {
    try {
      const document = previewDocument || (await loadQuotationDocument());
      if (!previewDocument) {
        setPreviewDocument(document);
      }
      downloadDocumentHtml(document, settings);
      showToast({
        message: "Quotation document downloaded as HTML.",
        title: "Download started"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Quotation document could not be downloaded."),
        title: "Download failed",
        tone: "error"
      });
    }
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setDetail(null);
    setPendingAction("");
    setIsConverting(false);

    async function loadDetail() {
      setIsLoading(true);
      setError("");

      try {
        const response = await config.get(id, { signal: controller.signal });

        if (active) {
          setDetail(response.data);
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = getApiErrorMessage(requestError, `${config.title} could not load.`);

        setError(message);
        showToast({
          message,
          title: `${config.title} unavailable`,
          tone: "error"
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      active = false;
      controller.abort();
    };
  }, [config, id, showToast]);

  if (isLoading) {
    return <LoadingSkeleton label={`Loading ${config.title.toLowerCase()}`} rows={4} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!detail) {
    return <EmptyState>{`No ${config.title.toLowerCase()} found.`}</EmptyState>;
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            {config.actions.map((spec) => {
              const enabled = spec.from.includes(detail.status);
              const isBusy = pendingAction === spec.action;
              return (
                <button
                  className={spec.action === "cancel" || spec.action === "reject" ? "secondary-button" : "primary-button"}
                  disabled={!enabled || Boolean(pendingAction)}
                  key={spec.action}
                  onClick={() => runLifecycleAction(spec)}
                  title={enabled ? `${spec.label} this ${config.title.toLowerCase()}` : describeReason(spec.label, detail.status)}
                  type="button"
                >
                  {isBusy ? `${spec.label}...` : spec.label}
                </button>
              );
            })}
            {kind === "orders" ? (
              <button
                className="primary-button"
                onClick={() => navigate(`/invoices/from-order/${detail.id}`)}
                type="button"
              >
                Create invoice
              </button>
            ) : null}
            {kind === "quotations" ? (
              <>
                <button
                  className="secondary-button"
                  disabled={isPreviewLoading}
                  onClick={openQuotationPreview}
                  type="button"
                >
                  {isPreviewLoading ? "Preparing..." : "Preview"}
                </button>
                <button
                  className="secondary-button"
                  disabled={isPreviewLoading}
                  onClick={handleQuotationDownload}
                  type="button"
                >
                  Download
                </button>
                <button
                  className="secondary-button"
                  disabled={isPreviewLoading}
                  onClick={handleQuotationPrint}
                  type="button"
                >
                  Print
                </button>
              </>
            ) : null}
            {kind === "quotations" ? (
              <button
                className="primary-button"
                disabled={isConverting || detail.status !== "accepted"}
                onClick={handleConvertToOrder}
                title={
                  detail.status === "accepted"
                    ? "Create a confirmed order from this quotation"
                    : "Only accepted quotations can be converted"
                }
                type="button"
              >
                {isConverting ? "Converting..." : "Convert to order"}
              </button>
            ) : null}
            <button
              className="secondary-button"
              onClick={() => navigate(`/audit/${kind === "orders" ? "order" : "quotation"}/${detail.id}`)}
              type="button"
            >
              Audit history
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate(config.listPath)}
              type="button"
            >
              Back to list
            </button>
          </div>
        }
        description={`${config.title} for ${formatCustomer(detail.customer)}.`}
        eyebrow={config.title}
        title={detail[config.numberKey]}
      />

      <section className="detail-grid">
        <div className="detail-field">
          <span>Status</span>
          <strong>
            <StatusPill
              kind={kind === "orders" ? "order" : "quotation"}
              status={detail.status}
            />
          </strong>
        </div>
        <DetailField label="Customer" value={formatCustomer(detail.customer)} />
        <DetailField
          label="Date"
          value={formatDateWith(settings, detail.orderDate || detail.issueDate)}
        />
        <DetailField
          label="Due / delivery"
          value={formatDateWith(settings, detail.deliveryDate || detail.expiryDate)}
        />
        <DetailField label="Subtotal" value={toMoney(detail.subtotal)} />
        <DetailField
          label={
            detail.discountType === "percent"
              ? `Discount (${Number(detail.discountValue || 0)}%)`
              : "Discount"
          }
          value={
            Number(detail.discountTotal || detail.discountAmount || 0) > 0
              ? `- ${toMoney(detail.discountTotal || detail.discountAmount)}`
              : "None"
          }
        />
        <DetailField
          label={
            detail.taxEnabled
              ? `Tax (${Number(detail.taxRate || 0)}%)`
              : "Tax"
          }
          value={
            detail.taxEnabled
              ? toMoney(detail.taxTotal || detail.taxAmount || 0)
              : "Not applied"
          }
        />
        <DetailField label="Grand total" value={toMoney(detail.grandTotal)} />
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Line items</h3>
        </div>
        {detail.items?.length ? (
          <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head detail-line-grid">
              <span>Product</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span>Total</span>
            </div>
            {detail.items.map((item) => (
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
        <p className="muted">{detail.notes || "No notes."}</p>
      </section>

      <AttachmentsPanel entityType={kind} entityId={detail.id} />

      {kind === "quotations" && previewDocument ? (
        <DocumentPreviewModal
          document={previewDocument}
          isLoading={isPreviewLoading}
          onClose={() => setPreviewDocument(null)}
          onDownload={handleQuotationDownload}
          onPrint={handleQuotationPrint}
          settings={settings}
        />
      ) : null}
    </div>
  );
}

export default TransactionDetailScreen;
