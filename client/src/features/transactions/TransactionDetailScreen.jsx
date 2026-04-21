import { useEffect, useState } from "react";
import {
  convertQuotationToOrder,
  downloadQuotationPdf,
  getOrder,
  getQuotationPrintDocument,
  getQuotation,
  transitionOrder,
  transitionQuotation
} from "../../services/transactionApi.js";
import { shareQuotation } from "../../services/documentShareApi.js";
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
import { formatCustomer } from "./transactionUtils.js";
import DocumentPreviewModal from "../documents/DocumentPreviewModal.jsx";
import DocumentShareModal from "../documents/DocumentShareModal.jsx";
import DocumentHeroPanel from "../documents/DocumentHeroPanel.jsx";
import DocumentTotalsCard from "../documents/DocumentTotalsCard.jsx";
import DocumentActionBar from "../documents/DocumentActionBar.jsx";
import {
  copyTextToClipboard,
  downloadBlobFile,
  getDownloadFilename,
  openDocumentPrintWindow
} from "../documents/documentUtils.js";

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
  const [shareDetails, setShareDetails] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

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
      const response = await downloadQuotationPdf(id);
      downloadBlobFile(
        response.data,
        getDownloadFilename(response.headers?.contentDisposition, `quotation-${id}.pdf`)
      );
      showToast({
        message: "Quotation PDF downloaded.",
        title: "Download started"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Quotation PDF could not be downloaded."),
        title: "Download failed",
        tone: "error"
      });
    }
  }

  async function openShareModal() {
    if (kind !== "quotations") {
      return;
    }

    setIsShareOpen(true);
    if (isShareLoading) {
      return;
    }

    setIsShareLoading(true);

    try {
      const response = await shareQuotation(id);
      setShareDetails(response.data);
      setDetail((current) => (current ? { ...current, sharing: response.data } : current));
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
          setShareDetails(response.data?.sharing || null);
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
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError("");
          setIsLoading(true);
          config
            .get(id)
            .then((response) => {
              setDetail(response.data);
              setShareDetails(response.data?.sharing || null);
            })
            .catch((requestError) =>
              setError(getApiErrorMessage(requestError, `${config.title} could not load.`))
            )
            .finally(() => setIsLoading(false));
        }}
      />
    );
  }

  if (!detail) {
    return <EmptyState>{`No ${config.title.toLowerCase()} found.`}</EmptyState>;
  }

  const discountAmount = Number(detail.discountTotal || detail.discountAmount || 0);
  const taxAmount = Number(detail.taxTotal || detail.taxAmount || 0);
  const totalsRows = [
    { label: "Subtotal", value: toMoney(detail.subtotal) },
    discountAmount > 0
      ? {
          label:
            detail.discountType === "percent"
              ? `Discount (${Number(detail.discountValue || 0)}%)`
              : "Discount",
          value: `- ${toMoney(discountAmount)}`,
          tone: "negative"
        }
      : null,
    detail.taxEnabled
      ? {
          label: `Tax (${Number(detail.taxRate || 0)}%)`,
          value: toMoney(taxAmount)
        }
      : null
  ];

  const lifecycleButtons = config.actions.map((spec) => {
    const enabled = spec.from.includes(detail.status);
    const isBusy = pendingAction === spec.action;
    const tone = spec.action === "cancel" || spec.action === "reject" ? "secondary" : "primary";
    return (
      <button
        className={tone === "primary" ? "primary-button" : "secondary-button"}
        disabled={!enabled || Boolean(pendingAction)}
        key={spec.action}
        onClick={() => runLifecycleAction(spec)}
        title={
          enabled
            ? `${spec.label} this ${config.title.toLowerCase()}`
            : describeReason(spec.label, detail.status)
        }
        type="button"
      >
        {isBusy ? `${spec.label}...` : spec.label}
      </button>
    );
  });

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="doc-toolbar">
            {kind === "quotations" ? (
              <DocumentActionBar
                extras={
                  <button
                    className="secondary-button doc-action-bar-button"
                    onClick={openShareModal}
                    type="button"
                  >
                    Send link
                  </button>
                }
                isBusy={isPreviewLoading}
                onDownload={handleQuotationDownload}
                onPreview={openQuotationPreview}
                onPrint={handleQuotationPrint}
              />
            ) : null}
            <div className="button-row doc-toolbar-lifecycle">
              {lifecycleButtons}
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
                onClick={() =>
                  navigate(
                    `/audit/${kind === "orders" ? "order" : "quotation"}/${detail.id}`
                  )
                }
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
          </div>
        }
        description={`${config.title} for ${formatCustomer(detail.customer)}.`}
        eyebrow={config.title}
        title={detail[config.numberKey]}
      />

      <DocumentHeroPanel
        eyebrow={config.title}
        number={detail[config.numberKey]}
        description={`Issued for ${formatCustomer(detail.customer)}`}
        statusKind={kind === "orders" ? "order" : "quotation"}
        status={detail.status}
        highlight={{
          label: "Grand total",
          value: toMoney(detail.grandTotal),
          tone: "primary"
        }}
        meta={[
          { label: "Customer", value: formatCustomer(detail.customer) },
          {
            label: kind === "orders" ? "Order date" : "Issue date",
            value: formatDateWith(settings, detail.orderDate || detail.issueDate)
          },
          {
            label: kind === "orders" ? "Delivery date" : "Expires",
            value: formatDateWith(settings, detail.deliveryDate || detail.expiryDate)
          },
          { label: "Subtotal", value: toMoney(detail.subtotal) }
        ]}
      />

      <section className="doc-body-grid">
        <section className="transaction-panel doc-body-main">
          <div className="panel-heading">
            <h3>Line items</h3>
            <span>{detail.items?.length || 0} items</span>
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
        <DocumentTotalsCard
          rows={totalsRows}
          grand={{ label: "Grand total", value: toMoney(detail.grandTotal) }}
        />
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

      {kind === "quotations" && isShareOpen ? (
        <DocumentShareModal
          isLoading={isShareLoading}
          onClose={() => setIsShareOpen(false)}
          onCopy={copyShareLink}
          onOpen={openSharedPreview}
          share={shareDetails}
        />
      ) : null}
    </div>
  );
}

export default TransactionDetailScreen;
