import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingState,
  PageHeader,
  Pagination,
  SectionHeader,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { createAdminVendor, listAdminVendors } from "../../services/adminVendorsApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, isValidEmail } from "../master-data/resourceUtils.js";

const VENDOR_STATUS_TONES = {
  active: "success",
  draft: "neutral",
  suspended: "danger",
  archived: "warning"
};

const PLAN_TONES = {
  free: "neutral",
  basic: "info",
  pro: "violet",
  custom: "success"
};

const INITIAL_FORM = {
  vendorName: "",
  adminName: "",
  adminEmail: "",
  temporaryPassword: ""
};

function formatToken(value) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function validateForm(form) {
  const errors = {};

  if (form.vendorName.trim().length < 2) {
    errors.vendorName = "Enter a vendor name.";
  }

  if (form.adminName.trim().length < 2) {
    errors.adminName = "Enter the admin's name.";
  }

  if (!form.adminEmail.trim() || !isValidEmail(form.adminEmail.trim())) {
    errors.adminEmail = "Enter a valid email address.";
  }

  if (form.temporaryPassword.length < 8) {
    errors.temporaryPassword = "Use at least 8 characters.";
  }

  return errors;
}

function PlanBadge({ plan }) {
  const planCode = plan || "free";

  return (
    <span className="admin-vendors-plan" data-tone={PLAN_TONES[planCode] || "neutral"}>
      {formatToken(planCode)}
    </span>
  );
}

function AdminVendorsScreen() {
  const { showToast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [form, setForm] = useState(INITIAL_FORM);

  const query = useMemo(
    () => ({
      ...filters,
      page,
      pageSize: 50
    }),
    [filters, page]
  );

  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listAdminVendors(query);
      setVendors(response.data?.items || []);
      setPagination(response.data?.pagination || null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Vendors could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  function updateFormField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  }

  function openCreateForm() {
    setForm(INITIAL_FORM);
    setFieldErrors({});
    setFormError("");
    setIsFormOpen(true);
  }

  function submitFilters(event) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      search: searchDraft.trim()
    }));
    setPage(1);
  }

  async function submitVendor(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      await createAdminVendor({
        vendorName: form.vendorName.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        temporaryPassword: form.temporaryPassword
      });
      showToast({
        title: "Vendor created",
        message: "The vendor workspace and vendor admin account are active.",
        tone: "success"
      });
      setIsFormOpen(false);
      setForm(INITIAL_FORM);
      setPage(1);
      setFilters({ search: "", status: "" });
      setSearchDraft("");
      loadVendors();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, "The vendor could not be created."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="resource-page admin-vendors-page">
      <PageHeader
        action={
          <button className="primary-button compact" onClick={openCreateForm} type="button">
            Create Vendor
          </button>
        }
        description="Onboard client workspaces and create their first vendor admin login."
        eyebrow="Admin"
        title="Vendor Management"
      />

      {error ? <ErrorState message={error} onRetry={loadVendors} /> : null}
      {isLoading ? <LoadingState>Loading vendors...</LoadingState> : null}

      {!isLoading ? (
        <section className="admin-vendors-panel">
          <SectionHeader
            hint="Search by vendor name, slug, contact email, or filter by workspace status."
            title="All vendors"
          />
          <Toolbar onSubmit={submitFilters}>
            <input
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search vendors"
              type="search"
              value={searchDraft}
            />
            <select
              onChange={(event) => {
                setFilters((current) => ({ ...current, status: event.target.value }));
                setPage(1);
              }}
              value={filters.status}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <button className="secondary-button" type="submit">
              Search
            </button>
          </Toolbar>

          {!vendors.length ? (
            <EmptyState
              action={
                <button className="primary-button compact" onClick={openCreateForm} type="button">
                  Create first vendor
                </button>
              }
              title="No vendors found"
            >
              Create a vendor workspace to give a client their first SupplyLink login.
            </EmptyState>
          ) : null}

          {vendors.length ? (
            <>
              <TableScroll>
                <div className="resource-table">
                  <div className="resource-table-head admin-vendors-grid">
                    <span>Name</span>
                    <span>Admin email</span>
                    <span>Status</span>
                    <span>Plan</span>
                  </div>
                  {vendors.map((vendor) => (
                    <article className="resource-row admin-vendors-grid" key={vendor.id}>
                      <div className="admin-vendors-name">
                        <strong>{vendor.displayName || vendor.legalName}</strong>
                        <small>{vendor.slug}</small>
                      </div>
                      <div className="admin-vendors-admin">
                        <strong>{vendor.adminUser?.email || "No admin assigned"}</strong>
                        <small>{vendor.adminUser?.fullName || vendor.contactEmail || "Not set"}</small>
                      </div>
                      <div>
                        <StatusPill
                          label={formatToken(vendor.status)}
                          status={vendor.status}
                          tone={VENDOR_STATUS_TONES[vendor.status] || "neutral"}
                        />
                      </div>
                      <div>
                        <PlanBadge plan={vendor.plan} />
                      </div>
                    </article>
                  ))}
                </div>
              </TableScroll>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          ) : null}
        </section>
      ) : null}

      {isFormOpen ? (
        <FormPanel
          error={formError}
          isSubmitting={isSaving}
          onCancel={() => setIsFormOpen(false)}
          onSubmit={submitVendor}
          submitLabel="Create vendor"
          title="Create vendor"
        >
          <Field error={fieldErrors.vendorName} label="Vendor name">
            <input
              autoFocus
              onChange={(event) => updateFormField("vendorName", event.target.value)}
              placeholder="Acme Distribution"
              required
              value={form.vendorName}
            />
          </Field>
          <Field error={fieldErrors.adminName} label="Admin name">
            <input
              onChange={(event) => updateFormField("adminName", event.target.value)}
              placeholder="Ayesha Khan"
              required
              value={form.adminName}
            />
          </Field>
          <Field error={fieldErrors.adminEmail} label="Admin email">
            <input
              onChange={(event) => updateFormField("adminEmail", event.target.value)}
              placeholder="admin@example.com"
              required
              type="email"
              value={form.adminEmail}
            />
          </Field>
          <Field
            error={fieldErrors.temporaryPassword}
            hint="Share this manually with the vendor admin after creation."
            label="Temporary password"
          >
            <input
              minLength="8"
              onChange={(event) => updateFormField("temporaryPassword", event.target.value)}
              required
              type="password"
              value={form.temporaryPassword}
            />
          </Field>
        </FormPanel>
      ) : null}
    </div>
  );
}

export default AdminVendorsScreen;
