import { useCallback, useMemo, useState } from "react";
import {
  createCustomer,
  listCustomers,
  updateCustomer
} from "../../services/masterDataApi.js";
import { useToast } from "../feedback/toastContext.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import {
  EmptyState,
  Field,
  FormPanel,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import {
  cleanOptional,
  cleanRequired,
  getApiErrorMessage,
  isValidEmail
} from "./resourceUtils.js";
import { useResourceDirectory } from "./useResourceDirectory.js";

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
  if (!record) {
    return blankForm;
  }

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
    if (error) {
      setError("");
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
    </FormPanel>
  );
}

function CustomersScreen() {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const query = useMemo(
    () => ({
      page,
      pageSize,
      search,
      status
    }),
    [page, pageSize, search, status]
  );
  const loadCustomers = useCallback((params, options) => listCustomers(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Customers could not be loaded."),
        title: "Customers unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadCustomers, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(search || status);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveCustomer(payload) {
    if (editingRecord) {
      await updateCustomer(editingRecord.customer.id, payload);
      showToast({
        message: "Customer changes were saved.",
        title: "Customer updated"
      });
    } else {
      await createCustomer(payload);
      showToast({
        message: "The customer is ready to use.",
        title: "Customer created"
      });
    }

    setEditingRecord(null);
    setIsCreating(false);
    reload();
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            New customer
          </button>
        }
        description="Manage vendor-linked customer records and relationship details."
        eyebrow="Customers"
        title="Customer directory"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name, company, email, phone"
          type="search"
          value={searchDraft}
        />
        <select
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
      </Toolbar>

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading customers...</p> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No customers match the current filters." : "No customers found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="resource-table">
          <div className="resource-table-head customer-grid">
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((record) => (
            <article className="resource-row customer-grid" key={record.customer.id}>
              <div>
                <strong>{record.customer.fullName}</strong>
                <span>{record.customer.companyName || record.relationship?.accountCode || "No company"}</span>
              </div>
              <span>{record.customer.email || "No email"}</span>
              <span>{record.customer.phone || "No phone"}</span>
              <span className="status-pill">{record.relationship?.status || "active"}</span>
              <button
                className="secondary-button compact"
                onClick={() => setEditingRecord(record)}
                type="button"
              >
                Edit
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating || editingRecord ? (
        <CustomerForm
          mode={editingRecord ? "edit" : "create"}
          onCancel={() => {
            setEditingRecord(null);
            setIsCreating(false);
          }}
          onSave={saveCustomer}
          record={editingRecord}
        />
      ) : null}
    </div>
  );
}

export default CustomersScreen;
