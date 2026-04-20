import { useEffect, useState } from "react";
import {
  convertQuotationToOrder,
  getOrder,
  getQuotation
} from "../../services/transactionApi.js";
import { PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { formatCustomer } from "./transactionUtils.js";

const configs = {
  orders: {
    get: getOrder,
    listPath: "/orders",
    numberKey: "orderNumber",
    title: "Order"
  },
  quotations: {
    get: getQuotation,
    listPath: "/quotations",
    numberKey: "quoteNumber",
    title: "Quotation"
  }
};

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function TransactionDetailScreen({ id, kind, navigate }) {
  const config = configs[kind];
  const { showToast } = useToast();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

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

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

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
    return <p className="surface-message loading">Loading {config.title.toLowerCase()}...</p>;
  }

  if (error) {
    return <p className="surface-message error">{error}</p>;
  }

  if (!detail) {
    return <p className="surface-message">No detail found.</p>;
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
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
        <DetailField label="Status" value={detail.status} />
        <DetailField label="Customer" value={formatCustomer(detail.customer)} />
        <DetailField label="Date" value={detail.orderDate || detail.issueDate} />
        <DetailField label="Due / delivery" value={detail.deliveryDate || detail.expiryDate} />
        <DetailField label="Subtotal" value={toMoney(detail.subtotal)} />
        <DetailField label="Grand total" value={toMoney(detail.grandTotal)} />
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Line items</h3>
        </div>
        {detail.items?.length ? (
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
        ) : (
          <p className="empty-panel">No line items found.</p>
        )}
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Notes</h3>
        </div>
        <p className="muted">{detail.notes || "No notes."}</p>
      </section>
    </div>
  );
}

export default TransactionDetailScreen;
