import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createInvoice,
  createInvoiceFromOrder
} from "../../services/invoiceApi.js";
import { getOrder, listOrders } from "../../services/transactionApi.js";
import { Field, PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import LineItemEditor from "../transactions/LineItemEditor.jsx";
import PricingFields from "../transactions/PricingFields.jsx";
import { useTransactionOptions } from "../transactions/useTransactionOptions.js";
import {
  addDays,
  calculateTotals,
  createBlankItem,
  createBlankPricing,
  formatApiError,
  formatCustomer,
  mapItemsForPayload,
  mapPricingForPayload,
  pricingFromRecord,
  todayDate,
  toMoney,
  validateLineItems,
  validatePricing
} from "../transactions/transactionUtils.js";

const invoiceStatuses = ["draft", "issued"];

function mapOrderOption(order) {
  return {
    id: order.id,
    label: order.orderNumber || order.id,
    secondaryText: formatCustomer(order.customer)
  };
}

function mapOrderItems(order) {
  return (order.items || []).map((item) => ({
    description: item.description || item.product?.name || "",
    productId: item.productId || item.product?.id || "",
    quantity: String(item.quantity || 1),
    unitPrice: String(item.unitPrice || 0)
  }));
}

function InvoiceCreateScreen({ navigate, orderId: routeOrderId }) {
  const { showToast } = useToast();
  const [sourceType, setSourceType] = useState(routeOrderId ? "order" : "manual");
  const [selectedOrderId, setSelectedOrderId] = useState(routeOrderId || "");
  const [orders, setOrders] = useState([]);
  const [sourceOrder, setSourceOrder] = useState(null);
  const [form, setForm] = useState({
    customerId: "",
    dueDate: addDays(14),
    issueDate: todayDate(),
    notes: "",
    status: "draft"
  });
  const [items, setItems] = useState([createBlankItem()]);
  const [pricing, setPricing] = useState(() => createBlankPricing());
  const [fieldErrors, setFieldErrors] = useState({});
  const [pricingErrors, setPricingErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const totals = useMemo(() => calculateTotals(items, pricing), [items, pricing]);

  function handlePricingChange(next) {
    setPricing(next);
    if (Object.values(pricingErrors).some(Boolean)) {
      setPricingErrors({});
    }
  }

  const handleOptionsError = useCallback(
    (message) => {
      showToast({
        message,
        title: "Form options unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { customers, error: optionsError, isLoading, products } = useTransactionOptions(
    handleOptionsError
  );
  const customerOptions = useMemo(() => {
    if (!sourceOrder?.customer?.id || customers.some((customer) => customer.id === sourceOrder.customer.id)) {
      return customers;
    }

    return [
      ...customers,
      {
        id: sourceOrder.customer.id,
        label: formatCustomer(sourceOrder.customer)
      }
    ];
  }, [customers, sourceOrder]);
  const orderOptions = useMemo(() => {
    if (!sourceOrder?.id || orders.some((order) => order.id === sourceOrder.id)) {
      return orders;
    }

    return [...orders, mapOrderOption(sourceOrder)];
  }, [orders, sourceOrder]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadOrders() {
      try {
        const response = await listOrders(
          { page: 1, pageSize: 100 },
          { signal: controller.signal }
        );

        if (active) {
          setOrders((response.data.items || []).map(mapOrderOption));
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        showToast({
          message: formatApiError(requestError, "Orders could not be loaded."),
          title: "Order source unavailable",
          tone: "error"
        });
      }
    }

    loadOrders();

    return () => {
      active = false;
      controller.abort();
    };
  }, [showToast]);

  useEffect(() => {
    if (sourceType !== "order" || !selectedOrderId) {
      setSourceOrder(null);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();

    async function loadOrder() {
      setIsLoadingOrder(true);
      setFormError("");

      try {
        const response = await getOrder(selectedOrderId, { signal: controller.signal });
        const order = response.data;

        if (!active) {
          return;
        }

        setSourceOrder(order);
        setForm((current) => ({
          ...current,
          customerId: order.customerId || order.customer?.id || "",
          notes: current.notes || order.notes || ""
        }));
        setItems(mapOrderItems(order));
        setPricing(pricingFromRecord(order));
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = formatApiError(requestError, "Selected order could not be loaded.");

        setFormError(message);
        showToast({
          message,
          title: "Order unavailable",
          tone: "error"
        });
      } finally {
        if (active) {
          setIsLoadingOrder(false);
        }
      }
    }

    loadOrder();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedOrderId, showToast, sourceType]);

  function updateForm(field, value) {
    if (formError) {
      setFormError("");
    }

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({
        ...current,
        [field]: ""
      }));
    }

    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function changeSourceType(value) {
    setSourceType(value);
    setFieldErrors({});
    setLineErrors({});
    setFormError("");
    setSourceOrder(null);

    if (value === "manual") {
      setSelectedOrderId("");
      setItems([createBlankItem()]);
      setPricing(createBlankPricing());
      setForm((current) => ({
        ...current,
        customerId: "",
        notes: ""
      }));
    }
  }

  function validateForm() {
    const errors = {};

    if (sourceType === "order" && !selectedOrderId) {
      errors.orderId = "Select an order.";
    }

    if (!form.customerId) {
      errors.customerId = "Select a customer.";
    }

    return errors;
  }

  async function submitInvoice(event) {
    event.preventDefault();
    setFormError("");

    const nextFieldErrors = validateForm();
    const nextLineErrors = validateLineItems(items);
    const nextPricingErrors = validatePricing(pricing);

    if (
      Object.values(nextFieldErrors).some(Boolean) ||
      Object.keys(nextLineErrors).length > 0 ||
      Object.values(nextPricingErrors).some(Boolean)
    ) {
      setFieldErrors(nextFieldErrors);
      setLineErrors(nextLineErrors);
      setPricingErrors(nextPricingErrors);
      return;
    }

    setFieldErrors({});
    setLineErrors({});
    setPricingErrors({});
    setIsSaving(true);

    const payload = {
      customerId: form.customerId,
      dueDate: form.dueDate || null,
      issueDate: form.issueDate || null,
      items: mapItemsForPayload(items),
      notes: form.notes.trim() || null,
      status: form.status,
      ...mapPricingForPayload(pricing)
    };

    try {
      const response =
        sourceType === "order"
          ? await createInvoiceFromOrder(selectedOrderId, payload)
          : await createInvoice(payload);

      showToast({
        message: "Invoice was created successfully.",
        title: "Invoice created"
      });
      navigate(`/invoices/${response.data.id}`, { replace: true });
    } catch (requestError) {
      const message = formatApiError(requestError, "Invoice could not be saved.");

      setFormError(message);
      showToast({
        message,
        title: "Invoice creation failed",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="transaction-form" onSubmit={submitInvoice}>
      <PageHeader
        action={
          <button className="secondary-button" onClick={() => navigate("/invoices")} type="button">
            Back to invoices
          </button>
        }
        description="Create an invoice manually or start from an existing order."
        eyebrow="Invoices"
        title="Create Invoice"
      />

      {optionsError ? <p className="surface-message error">{optionsError}</p> : null}
      {formError ? <p className="surface-message error">{formError}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading customers and products...</p> : null}
      {isLoadingOrder ? <p className="surface-message loading">Loading order details...</p> : null}

      <section className="transaction-panel">
        <div className="form-grid">
          <Field label="Invoice source">
            <select
              onChange={(event) => changeSourceType(event.target.value)}
              value={sourceType}
            >
              <option value="manual">Manual invoice</option>
              <option value="order">From order</option>
            </select>
          </Field>

          {sourceType === "order" ? (
            <Field error={fieldErrors.orderId} label="Order">
              <select
                onChange={(event) => {
                  setSelectedOrderId(event.target.value);
                  setFieldErrors((current) => ({ ...current, orderId: "" }));
                }}
                value={selectedOrderId}
              >
                <option value="">Select order</option>
                {orderOptions.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.label} - {order.secondaryText}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field error={fieldErrors.customerId} label="Customer">
            <select
              disabled={sourceType === "order"}
              onChange={(event) => updateForm("customerId", event.target.value)}
              value={form.customerId}
            >
              <option value="">Select customer</option>
              {customerOptions.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              onChange={(event) => updateForm("status", event.target.value)}
              value={form.status}
            >
              {invoiceStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Issue date">
            <input
              onChange={(event) => updateForm("issueDate", event.target.value)}
              type="date"
              value={form.issueDate}
            />
          </Field>

          <Field label="Due date">
            <input
              onChange={(event) => updateForm("dueDate", event.target.value)}
              type="date"
              value={form.dueDate}
            />
          </Field>

          <Field label="Notes">
            <textarea
              onChange={(event) => updateForm("notes", event.target.value)}
              rows="3"
              value={form.notes}
            />
          </Field>
        </div>

        {sourceOrder ? (
          <p className="muted source-note">
            Source order {sourceOrder.orderNumber} for {formatCustomer(sourceOrder.customer)}.
            Line items are editable before the invoice is created.
          </p>
        ) : null}
      </section>

      <LineItemEditor errors={lineErrors} items={items} onChange={setItems} products={products} />

      <PricingFields errors={pricingErrors} onChange={handlePricingChange} pricing={pricing} />

      <section className="totals-panel">
        <div>
          <span>Subtotal</span>
          <strong>{toMoney(totals.subtotal)}</strong>
        </div>
        {totals.discountTotal > 0 ? (
          <div>
            <span>Discount</span>
            <strong>-{toMoney(totals.discountTotal)}</strong>
          </div>
        ) : null}
        {totals.taxTotal > 0 ? (
          <div>
            <span>Tax</span>
            <strong>{toMoney(totals.taxTotal)}</strong>
          </div>
        ) : null}
        <div>
          <span>Grand total</span>
          <strong>{toMoney(totals.grandTotal)}</strong>
        </div>
        <button
          className="primary-button"
          disabled={isSaving || isLoading || isLoadingOrder}
          type="submit"
        >
          {isSaving ? "Saving..." : "Create invoice"}
        </button>
      </section>
    </form>
  );
}

export default InvoiceCreateScreen;
