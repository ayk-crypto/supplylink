import { useCallback, useState } from "react";
import { createOrder, createQuotation } from "../../services/transactionApi.js";
import { Field, PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import LineItemEditor from "./LineItemEditor.jsx";
import { useTransactionOptions } from "./useTransactionOptions.js";
import {
  addDays,
  calculateTotals,
  createBlankItem,
  formatApiError,
  mapItemsForPayload,
  todayDate,
  toMoney,
  validateLineItems
} from "./transactionUtils.js";

const configs = {
  orders: {
    create: createOrder,
    dateField: "orderDate",
    dateLabel: "Order date",
    defaultStatus: "draft",
    listPath: "/orders",
    notesLabel: "Notes",
    secondaryDateField: "requestedDeliveryDate",
    secondaryDateLabel: "Requested delivery",
    statuses: ["draft", "confirmed"],
    successTitle: "Order created",
    title: "Create order"
  },
  quotations: {
    create: createQuotation,
    dateField: "issueDate",
    dateLabel: "Issue date",
    defaultStatus: "draft",
    listPath: "/quotations",
    notesLabel: "Notes",
    secondaryDateField: "expiryDate",
    secondaryDateLabel: "Expiry date",
    statuses: ["draft", "sent"],
    successTitle: "Quotation created",
    title: "Create quotation"
  }
};

function TransactionCreateScreen({ kind, navigate }) {
  const config = configs[kind];
  const { showToast } = useToast();
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
  const [form, setForm] = useState({
    customerId: "",
    notes: "",
    primaryDate: todayDate(),
    secondaryDate: kind === "quotations" ? addDays(14) : "",
    status: config.defaultStatus
  });
  const [items, setItems] = useState([createBlankItem()]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const totals = calculateTotals(items);

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

  function validateForm() {
    const errors = {};

    if (!form.customerId) {
      errors.customerId = "Select a customer.";
    }

    return errors;
  }

  async function submitTransaction(event) {
    event.preventDefault();
    setFormError("");

    const nextFieldErrors = validateForm();
    const nextLineErrors = validateLineItems(items);

    if (
      Object.values(nextFieldErrors).some(Boolean) ||
      Object.keys(nextLineErrors).length > 0
    ) {
      setFieldErrors(nextFieldErrors);
      setLineErrors(nextLineErrors);
      return;
    }

    setFieldErrors({});
    setLineErrors({});
    setIsSaving(true);

    const payload = {
      customerId: form.customerId,
      [config.dateField]: form.primaryDate || null,
      [config.secondaryDateField]: form.secondaryDate || null,
      items: mapItemsForPayload(items),
      notes: form.notes.trim() || null,
      status: form.status
    };

    try {
      const response = await config.create(payload);

      showToast({
        message: `${kind === "orders" ? "Order" : "Quotation"} was created successfully.`,
        title: config.successTitle
      });
      navigate(`${config.listPath}/${response.data.id}`, { replace: true });
    } catch (requestError) {
      const message = formatApiError(requestError, `${config.title} could not be saved.`);

      setFormError(message);
      showToast({
        message,
        title: `${config.title} failed`,
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="transaction-form" onSubmit={submitTransaction}>
      <PageHeader
        action={
          <button
            className="secondary-button"
            onClick={() => navigate(config.listPath)}
            type="button"
          >
            Back to list
          </button>
        }
        description="Select a customer, add product lines, and let the backend calculate final totals."
        eyebrow={kind}
        title={config.title}
      />

      {optionsError ? <p className="surface-message error">{optionsError}</p> : null}
      {formError ? <p className="surface-message error">{formError}</p> : null}
      {isLoading ? <p className="surface-message">Loading customers and products...</p> : null}

      <section className="transaction-panel">
        <div className="form-grid">
          <Field error={fieldErrors.customerId} label="Customer">
            <select
              onChange={(event) => updateForm("customerId", event.target.value)}
              value={form.customerId}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
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
              {config.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          <Field label={config.dateLabel}>
            <input
              onChange={(event) => updateForm("primaryDate", event.target.value)}
              type="date"
              value={form.primaryDate}
            />
          </Field>
          <Field label={config.secondaryDateLabel}>
            <input
              onChange={(event) => updateForm("secondaryDate", event.target.value)}
              type="date"
              value={form.secondaryDate}
            />
          </Field>
          <Field label={config.notesLabel}>
            <textarea
              onChange={(event) => updateForm("notes", event.target.value)}
              rows="3"
              value={form.notes}
            />
          </Field>
        </div>
      </section>

      <LineItemEditor errors={lineErrors} items={items} onChange={setItems} products={products} />

      <section className="totals-panel">
        <div>
          <span>Subtotal</span>
          <strong>{toMoney(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Grand total</span>
          <strong>{toMoney(totals.grandTotal)}</strong>
        </div>
        <button className="primary-button" disabled={isSaving || isLoading} type="submit">
          {isSaving ? "Saving..." : config.title}
        </button>
      </section>
    </form>
  );
}

export default TransactionCreateScreen;
