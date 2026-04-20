import { useState } from "react";
import { adjustInventory } from "../../services/inventoryApi.js";
import { Field, FormPanel } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";

const blankForm = {
  notes: "",
  quantity: "",
  referenceType: "manual",
  type: "adjustment"
};

function StockAdjustForm({ onCancel, onSuccess, product }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    if (error) {
      setError("");
    }

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: "" }));
    }

    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const errors = {};
    const quantity = Number(form.quantity);

    if (form.quantity === "" || Number.isNaN(quantity)) {
      errors.quantity = "Enter a quantity.";
    } else if (quantity === 0) {
      errors.quantity = "Quantity must not be zero.";
    } else if (form.type !== "adjustment" && quantity < 0) {
      errors.quantity = "Use a positive quantity for inbound/outbound.";
    }

    if (form.referenceType && form.referenceType.trim().length > 50) {
      errors.referenceType = "Reference type must be 50 characters or less.";
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const nextFieldErrors = validate();

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      const response = await adjustInventory({
        notes: form.notes.trim() || null,
        productId: product.id,
        quantity: Number(form.quantity),
        referenceType: form.referenceType.trim() || "manual",
        type: form.type
      });

      showToast({
        message: `${product.name} stock updated.`,
        title: "Stock adjusted"
      });

      onSuccess?.(response.data);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Stock could not be adjusted.");

      setError(message);
      showToast({
        message,
        title: "Adjustment failed",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPanel
      error={error}
      isSubmitting={isSaving}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel="Apply adjustment"
      title={`Adjust stock — ${product?.name || "Product"}`}
    >
      <Field label="Movement type">
        <select
          onChange={(event) => updateField("type", event.target.value)}
          value={form.type}
        >
          <option value="adjustment">Adjustment (signed)</option>
          <option value="inbound">Inbound (receive)</option>
          <option value="outbound">Outbound (issue)</option>
        </select>
      </Field>
      <Field
        error={fieldErrors.quantity}
        hint={
          form.type === "adjustment"
            ? "Use a negative number to decrease stock."
            : "Always enter a positive number."
        }
        label="Quantity"
      >
        <input
          onChange={(event) => updateField("quantity", event.target.value)}
          step="0.001"
          type="number"
          value={form.quantity}
        />
      </Field>
      <Field
        error={fieldErrors.referenceType}
        hint="A short label for where this change came from (e.g. manual, recount, loss)."
        label="Reference type"
      >
        <input
          maxLength={50}
          onChange={(event) => updateField("referenceType", event.target.value)}
          type="text"
          value={form.referenceType}
        />
      </Field>
      <Field label="Notes">
        <textarea
          maxLength={5000}
          onChange={(event) => updateField("notes", event.target.value)}
          rows="3"
          value={form.notes}
        />
      </Field>
    </FormPanel>
  );
}

export default StockAdjustForm;
