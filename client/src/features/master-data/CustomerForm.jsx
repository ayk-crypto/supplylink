import { useState } from "react";
import AttachmentsPanel from "../attachments/AttachmentsPanel.jsx";
import { useToast } from "../feedback/toastContext.js";
import {
  Field,
  FormPanel
} from "../../components/ui/ResourceScreens.jsx";
import {
  cleanOptional,
  cleanRequired,
  getApiErrorMessage,
  isValidEmail
} from "./resourceUtils.js";

const blankForm = {
  accountCode: "",
  companyName: "",
  email: "",
  fullName: "",
  notes: "",
  phone: "",
  status: "active"
};

function toCustomerForm(record) {
  if (!record) return blankForm;
  return {
    accountCode: record.relationship?.accountCode || "",
    companyName: record.customer?.companyName || "",
    email: record.customer?.email || "",
    fullName: record.customer?.fullName || "",
    notes: record.relationship?.notes || "",
    phone: record.customer?.phone || "",
    status: record.relationship?.status || "active"
  };
}

function toCustomerPayload(form) {
  return {
    customer: {
      fullName: cleanRequired(form.fullName),
      companyName: cleanOptional(form.companyName),
      email: cleanOptional(form.email),
      phone: cleanOptional(form.phone)
    },
    relationship: {
      accountCode: cleanOptional(form.accountCode),
      notes: cleanOptional(form.notes),
      status: form.status
    }
  };
}

function validateCustomerForm(form) {
  const errors = {};
  const fullName = cleanRequired(form.fullName);
  const email = cleanOptional(form.email);
  const phone = cleanOptional(form.phone);

  if (!fullName || fullName.length < 2) {
    errors.fullName = "Enter the customer's full name.";
  }
  if (!email && !phone) {
    errors.email = "Add an email or phone number.";
    errors.phone = "Add a phone number or email.";
  }
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (phone && phone.length < 3) {
    errors.phone = "Enter a valid phone number.";
  }
  return errors;
}

function CustomerForm({ mode, onCancel, onSave, record }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(() => toCustomerForm(record));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    if (error) setError("");
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: "" }));
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const nextFieldErrors = validateCustomerForm(form);
    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    setIsSaving(true);
    try {
      await onSave(toCustomerPayload(form));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Customer could not be saved.");
      setError(message);
      showToast({
        message,
        title: mode === "edit" ? "Customer update failed" : "Customer create failed",
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
      submitLabel={mode === "edit" ? "Save customer" : "Create customer"}
      title={mode === "edit" ? "Edit customer" : "Create customer"}
    >
      <Field error={fieldErrors.fullName} label="Full name">
        <input
          onChange={(event) => updateField("fullName", event.target.value)}
          required
          type="text"
          value={form.fullName}
        />
      </Field>
      <Field label="Company">
        <input
          onChange={(event) => updateField("companyName", event.target.value)}
          type="text"
          value={form.companyName}
        />
      </Field>
      <Field error={fieldErrors.email} label="Email">
        <input
          onChange={(event) => updateField("email", event.target.value)}
          type="email"
          value={form.email}
        />
      </Field>
      <Field error={fieldErrors.phone} label="Phone">
        <input
          onChange={(event) => updateField("phone", event.target.value)}
          type="tel"
          value={form.phone}
        />
      </Field>
      <Field label="Relationship status">
        <select onChange={(event) => updateField("status", event.target.value)} value={form.status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </Field>
      <Field label="Account code">
        <input
          onChange={(event) => updateField("accountCode", event.target.value)}
          type="text"
          value={form.accountCode}
        />
      </Field>
      <Field label="Notes">
        <textarea
          onChange={(event) => updateField("notes", event.target.value)}
          rows="3"
          value={form.notes}
        />
      </Field>
      {mode === "edit" && record?.customer?.id ? (
        <div className="form-attachments">
          <AttachmentsPanel entityType="customers" entityId={record.customer.id} />
        </div>
      ) : null}
    </FormPanel>
  );
}

export default CustomerForm;
