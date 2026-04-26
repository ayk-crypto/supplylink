import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingState,
  PageHeader,
  SectionHeader,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import StatusPill from "../../components/ui/StatusPill.jsx";
import { createAdminVendor, listAdminVendors } from "../../services/adminVendorsApi.js";
import { listAdminSubscriptions } from "../../services/adminBillingApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, isValidEmail } from "../master-data/resourceUtils.js";
import {
  ENGAGEMENT_FILTER_OPTIONS,
  ENGAGEMENT_LABELS,
  ENGAGEMENT_TONES,
  classifyEngagement,
  formatLastActivity,
  getLastActivityDate
} from "../../utils/engagement.js";

const VISIBLE_BADGE_ENGAGEMENTS = new Set(["at_risk", "dormant"]);

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

const INITIAL_KPIS = {
  totalVendors: 0,
  activeVendors: 0,
  trialCount: 0,
  paidCount: 0,
  atRiskCount: 0,
  vendorsSampled: 0,
  loaded: false
};

function EngagementBadge({ engagement }) {
  const key = engagement || "active";
  return (
    <span
      className="admin-vendors-engagement-badge"
      data-engagement={key}
      data-tone={ENGAGEMENT_TONES[key] || "neutral"}
    >
      {ENGAGEMENT_LABELS[key] || "Active"}
    </span>
  );
}

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

function formatDateShort(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "—";
  }
}

/* Generates a human-readable temporary password using the Web Crypto
   API where available, with a Math.random fallback for older runtimes.
   Excludes ambiguous characters (0/O, 1/l/I) to reduce read-aloud errors. */
function generateTemporaryPassword(length = 14) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(length);
    crypto.getRandomValues(buffer);
    let result = "";
    for (let index = 0; index < length; index += 1) {
      result += charset[buffer[index] % charset.length];
    }
    return result;
  }
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

function VendorDetailEngagement({ vendor }) {
  const engagement = classifyEngagement(vendor);
  return VISIBLE_BADGE_ENGAGEMENTS.has(engagement) ? (
    <EngagementBadge engagement={engagement} />
  ) : (
    <span className="admin-vendors-engagement-active-text">Active</span>
  );
}

function VendorDetailModal({ vendor, onClose }) {
  const { showToast } = useToast();
  const [tempPassword, setTempPassword] = useState(null);
  const [isConfirmingSuspend, setIsConfirmingSuspend] = useState(false);

  if (!vendor) return null;

  const vendorLabel = vendor.displayName || vendor.legalName || "this vendor";
  const planCode = vendor.plan || "free";
  const billingCycle = vendor.billingCycle || vendor.subscription?.billingCycle || null;
  const periodEnd = vendor.currentPeriodEnd || vendor.subscription?.currentPeriodEnd || null;
  const lastPayment =
    vendor.lastPaymentAt ||
    vendor.lastPayment ||
    vendor.subscription?.lastPaymentAt ||
    null;

  const handleResetPassword = () => {
    setTempPassword(generateTemporaryPassword(14));
  };

  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(tempPassword);
        showToast({
          title: "Password copied",
          message: "Temporary password copied to your clipboard.",
          tone: "success"
        });
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      showToast({
        title: "Copy unavailable",
        message: "Select the password manually to copy it.",
        tone: "warning"
      });
    }
  };

  const handleLoginAsVendor = () => {
    showToast({
      title: "Coming soon",
      message: `Impersonation for ${vendorLabel} will be available in a future release.`,
      tone: "info"
    });
  };

  const handleManageBilling = () => {
    showToast({
      title: "Manage billing",
      message: "Open the Admin Billing page from the sidebar to manage subscriptions.",
      tone: "info"
    });
  };

  const handleConfirmSuspend = () => {
    setIsConfirmingSuspend(false);
    showToast({
      title: "Coming soon",
      message: `Suspension for ${vendorLabel} will be available in a future release.`,
      tone: "warning"
    });
  };

  return (
    <div
      className="admin-vendors-detail-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="admin-vendors-detail-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Vendor details for ${vendorLabel}`}
      >
        <header className="admin-vendors-detail-head">
          <div className="admin-vendors-detail-head-main">
            <div className="admin-vendors-detail-head-title">
              <h2>{vendor.displayName || vendor.legalName || "Vendor"}</h2>
              <StatusPill
                label={formatToken(vendor.status)}
                status={vendor.status}
                tone={VENDOR_STATUS_TONES[vendor.status] || "neutral"}
              />
            </div>
            <p>{vendor.slug || "—"}</p>
          </div>
          <button
            aria-label="Close vendor details"
            className="link-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>

        <div className="admin-vendors-detail-body">
          <section className="admin-vendors-detail-section" aria-labelledby="vd-basic">
            <h3 className="admin-vendors-detail-section-title" id="vd-basic">
              Basic Info
            </h3>
            <dl className="admin-vendors-detail-grid">
              <div className="admin-vendors-detail-row">
                <dt>Status</dt>
                <dd>
                  <StatusPill
                    label={formatToken(vendor.status)}
                    status={vendor.status}
                    tone={VENDOR_STATUS_TONES[vendor.status] || "neutral"}
                  />
                </dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Legal name</dt>
                <dd>{vendor.legalName || "—"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Slug</dt>
                <dd>{vendor.slug || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-vendors-detail-section" aria-labelledby="vd-admin">
            <h3 className="admin-vendors-detail-section-title" id="vd-admin">
              Admin Info
            </h3>
            <dl className="admin-vendors-detail-grid">
              <div className="admin-vendors-detail-row">
                <dt>Admin name</dt>
                <dd>{vendor.adminUser?.fullName || "—"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Admin email</dt>
                <dd>{vendor.adminUser?.email || vendor.contactEmail || "—"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Contact email</dt>
                <dd>{vendor.contactEmail || "—"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Contact phone</dt>
                <dd>
                  {vendor.contactPhone ? (
                    <a
                      className="admin-vendors-detail-link"
                      href={`tel:${encodeURIComponent(
                        vendor.contactPhone.trim()
                      )}`}
                    >
                      {vendor.contactPhone}
                    </a>
                  ) : (
                    <span className="admin-vendors-detail-empty">Not set</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-vendors-detail-section" aria-labelledby="vd-billing">
            <h3 className="admin-vendors-detail-section-title" id="vd-billing">
              Billing Info
            </h3>
            <dl className="admin-vendors-detail-grid">
              <div className="admin-vendors-detail-row">
                <dt>Plan</dt>
                <dd>
                  <PlanBadge plan={planCode} />
                </dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Billing cycle</dt>
                <dd>{billingCycle ? formatToken(billingCycle) : "Not set"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Period end</dt>
                <dd>{periodEnd ? formatDateShort(periodEnd) : "Not set"}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Last payment</dt>
                <dd>{lastPayment ? formatDateShort(lastPayment) : "Not set"}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-vendors-detail-section" aria-labelledby="vd-activity">
            <h3 className="admin-vendors-detail-section-title" id="vd-activity">
              Activity
            </h3>
            <dl className="admin-vendors-detail-grid">
              <div className="admin-vendors-detail-row">
                <dt>Created</dt>
                <dd>{formatDateShort(vendor.createdAt)}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Last activity</dt>
                <dd>{formatLastActivity(getLastActivityDate(vendor))}</dd>
              </div>
              <div className="admin-vendors-detail-row">
                <dt>Engagement</dt>
                <dd>
                  <VendorDetailEngagement vendor={vendor} />
                </dd>
              </div>
            </dl>
          </section>

          <section
            className="admin-vendors-detail-section admin-vendors-detail-actions-section"
            aria-labelledby="vd-actions"
          >
            <h3 className="admin-vendors-detail-section-title" id="vd-actions">
              Actions
            </h3>

            {tempPassword ? (
              <div
                className="admin-vendors-detail-password-callout"
                role="status"
                aria-live="polite"
              >
                <div className="admin-vendors-detail-password-label">Temporary password</div>
                <div className="admin-vendors-detail-password-value">
                  <code>{tempPassword}</code>
                  <button
                    className="link-button"
                    onClick={handleCopyPassword}
                    type="button"
                  >
                    Copy
                  </button>
                </div>
                <p className="admin-vendors-detail-password-hint">
                  Share this with the vendor securely. It will not be shown again after you
                  close this dialog.
                </p>
              </div>
            ) : null}

            {isConfirmingSuspend ? (
              <div
                className="admin-vendors-detail-confirm"
                role="alertdialog"
                aria-label="Confirm suspend vendor"
              >
                <p>
                  Suspend <strong>{vendorLabel}</strong>? They will lose access until reactivated.
                </p>
                <div className="admin-vendors-detail-confirm-actions">
                  <button
                    className="secondary-button compact"
                    onClick={() => setIsConfirmingSuspend(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="admin-vendors-detail-danger-button"
                    onClick={handleConfirmSuspend}
                    type="button"
                  >
                    Yes, suspend
                  </button>
                </div>
              </div>
            ) : null}

            <div className="admin-vendors-detail-action-row">
              <button
                className="primary-button compact"
                onClick={handleLoginAsVendor}
                type="button"
              >
                Login as Vendor
              </button>
              <button
                className="secondary-button compact"
                onClick={handleResetPassword}
                type="button"
              >
                Reset Password
              </button>
              <button
                className="secondary-button compact"
                onClick={handleManageBilling}
                type="button"
              >
                Manage Billing
              </button>
            </div>

            <div className="admin-vendors-detail-danger-zone">
              <div className="admin-vendors-detail-danger-zone-copy">
                <strong>Danger zone</strong>
                <p>Suspending blocks this vendor's access until reactivated.</p>
              </div>
              <button
                className="admin-vendors-detail-danger-button"
                onClick={() => setIsConfirmingSuspend(true)}
                type="button"
                disabled={isConfirmingSuspend}
              >
                Suspend Vendor
              </button>
            </div>
          </section>
        </div>
      </aside>
    </div>
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
  const [engagementFilter, setEngagementFilter] = useState("all");
  const [form, setForm] = useState(INITIAL_FORM);
  const [kpis, setKpis] = useState(INITIAL_KPIS);
  const [viewingVendor, setViewingVendor] = useState(null);

  const query = useMemo(
    () => ({
      ...filters,
      page,
      pageSize: 50
    }),
    [filters, page]
  );

  const decoratedVendors = useMemo(
    () =>
      vendors.map((vendor) => ({
        ...vendor,
        engagement: classifyEngagement(vendor),
        lastActivityAt: getLastActivityDate(vendor)
      })),
    [vendors]
  );

  const visibleVendors = useMemo(() => {
    if (engagementFilter === "all") return decoratedVendors;
    return decoratedVendors.filter((vendor) => vendor.engagement === engagementFilter);
  }, [decoratedVendors, engagementFilter]);

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

  const loadKpis = useCallback(async () => {
    try {
      const [totalResponse, activeResponse, subsResponse, sampleResponse] = await Promise.all([
        listAdminVendors({ pageSize: 1 }),
        listAdminVendors({ pageSize: 1, status: "active" }),
        listAdminSubscriptions({ pageSize: 100 }),
        listAdminVendors({ pageSize: 100 })
      ]);

      const totalVendors = totalResponse.data?.pagination?.totalItems ?? 0;
      const activeVendors = activeResponse.data?.pagination?.totalItems ?? 0;

      const sampledVendors = sampleResponse.data?.items || [];
      let atRiskCount = 0;
      sampledVendors.forEach((vendor) => {
        if (classifyEngagement(vendor) === "at_risk") atRiskCount += 1;
      });

      const subscriptions = subsResponse.data?.items || [];
      const PAID_PLAN_CODES = new Set(["basic", "pro", "custom"]);
      let trialCount = 0;
      let paidCount = 0;
      const seenPaidVendors = new Set();
      const seenTrialVendors = new Set();
      subscriptions.forEach((subscription) => {
        const status = subscription.subscriptionStatus || subscription.status || null;
        const planCode =
          subscription.currentPlan ||
          subscription.basePlan ||
          subscription.planCode ||
          subscription.plan ||
          null;
        const vendorId = subscription.vendor?.id || subscription.vendorId;
        if (!vendorId) return;

        const isPaidPlan = PAID_PLAN_CODES.has(planCode);
        const isTrialStatus = status === "trial";
        const isActiveStatus = status === "active";

        // Trial Vendors → only subscriptions in "trial" status
        if (isTrialStatus && !seenTrialVendors.has(vendorId)) {
          seenTrialVendors.add(vendorId);
          trialCount += 1;
        }

        // Paid Vendors → must be on a paid plan (basic/pro/custom)
        // AND have an active or trial subscription. Free plans never count.
        if (
          isPaidPlan &&
          (isActiveStatus || isTrialStatus) &&
          !seenPaidVendors.has(vendorId)
        ) {
          seenPaidVendors.add(vendorId);
          paidCount += 1;
        }
      });

      setKpis({
        totalVendors,
        activeVendors,
        trialCount,
        paidCount,
        atRiskCount,
        vendorsSampled: sampledVendors.length,
        loaded: true
      });
    } catch {
      setKpis((current) => ({ ...current, loaded: true }));
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  // Live-search debounce — replaces the removed Search button
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((current) => {
        const next = searchDraft.trim();
        if (current.search === next) return current;
        return { ...current, search: next };
      });
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft]);

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
      loadKpis();
    } catch (requestError) {
      setFormError(getApiErrorMessage(requestError, "The vendor could not be created."));
    } finally {
      setIsSaving(false);
    }
  }

  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.totalItems ?? vendors.length;
  const currentPage = pagination?.page || page;
  const showPager = totalPages > 1;

  return (
    <div className="resource-page admin-vendors-page">
      <PageHeader
        action={
          <div className="button-row">
            <button className="primary-button compact" onClick={openCreateForm} type="button">
              + Create Vendor
            </button>
          </div>
        }
        description="Manage your client workspaces, subscriptions, and access."
        eyebrow="Admin"
        title="Vendor Management"
      />

      <section className="admin-vendors-kpis" aria-label="Vendor metrics">
        <div className="admin-vendors-kpi">
          <span className="admin-vendors-kpi-label">Total vendors</span>
          <strong className="admin-vendors-kpi-value">{kpis.totalVendors}</strong>
          <span className="admin-vendors-kpi-hint">
            {kpis.totalVendors === 1 ? "1 workspace" : `${kpis.totalVendors} workspaces`}
          </span>
        </div>
        <div className="admin-vendors-kpi">
          <span className="admin-vendors-kpi-label">Active vendors</span>
          <strong className="admin-vendors-kpi-value">{kpis.activeVendors}</strong>
          <span className="admin-vendors-kpi-hint">
            {Math.max(0, kpis.totalVendors - kpis.activeVendors)} inactive
          </span>
        </div>
        <div className="admin-vendors-kpi">
          <span className="admin-vendors-kpi-label">Trial vendors</span>
          <strong className="admin-vendors-kpi-value">{kpis.trialCount}</strong>
          <span className="admin-vendors-kpi-hint">
            {kpis.trialCount === 0 ? "0 in trial" : `${kpis.trialCount} in trial`}
          </span>
        </div>
        <div className="admin-vendors-kpi">
          <span className="admin-vendors-kpi-label">Paid vendors</span>
          <strong className="admin-vendors-kpi-value">{kpis.paidCount}</strong>
          <span className="admin-vendors-kpi-hint">
            {kpis.paidCount === 1 ? "1 active subscription" : `${kpis.paidCount} active subscriptions`}
          </span>
        </div>
        <div className="admin-vendors-kpi" data-tone="warning">
          <span className="admin-vendors-kpi-label">At risk vendors</span>
          <strong className="admin-vendors-kpi-value">{kpis.atRiskCount}</strong>
          <span className="admin-vendors-kpi-hint">
            {kpis.atRiskCount === 0
              ? "No vendors at risk"
              : kpis.totalVendors > kpis.vendorsSampled
                ? `${kpis.atRiskCount} of ${kpis.vendorsSampled} sampled`
                : `Inactive 14–30 days`}
          </span>
        </div>
      </section>

      {error ? <ErrorState message={error} onRetry={loadVendors} /> : null}
      {isLoading ? <LoadingState>Loading vendors...</LoadingState> : null}

      {!isLoading ? (
        <section className="admin-vendors-panel">
          <SectionHeader title="All vendors" />
          <Toolbar onSubmit={submitFilters}>
            <input
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search vendors by name or email"
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
            <select
              aria-label="Filter by engagement"
              onChange={(event) => setEngagementFilter(event.target.value)}
              value={engagementFilter}
            >
              {ENGAGEMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

          {vendors.length && !visibleVendors.length ? (
            <EmptyState title="No vendors match this filter">
              Try a different engagement filter to see more vendors.
            </EmptyState>
          ) : null}

          {visibleVendors.length ? (
            <>
              <TableScroll>
                <div className="resource-table">
                  <div className="resource-table-head admin-vendors-grid">
                    <span>Name</span>
                    <span>Admin email</span>
                    <span>Status</span>
                    <span>Plan</span>
                    <span>Last activity</span>
                    <span className="admin-vendors-actions-head">Actions</span>
                  </div>
                  {visibleVendors.map((vendor) => (
                    <article
                      className="resource-row admin-vendors-grid"
                      data-engagement={vendor.engagement}
                      key={vendor.id}
                    >
                      <div className="admin-vendors-name">
                        <strong>{vendor.displayName || vendor.legalName}</strong>
                        <small>{vendor.slug}</small>
                      </div>
                      <div className="admin-vendors-admin">
                        <strong>{vendor.adminUser?.fullName || "Not set"}</strong>
                        <small>{vendor.adminUser?.email || vendor.contactEmail || "No admin assigned"}</small>
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
                      <div className="admin-vendors-activity">
                        <strong>{formatLastActivity(vendor.lastActivityAt)}</strong>
                        {VISIBLE_BADGE_ENGAGEMENTS.has(vendor.engagement) ? (
                          <EngagementBadge engagement={vendor.engagement} />
                        ) : null}
                      </div>
                      <div className="admin-vendors-actions-cell">
                        <button
                          className="secondary-button compact admin-vendors-view-button"
                          onClick={() => setViewingVendor(vendor)}
                          type="button"
                        >
                          View
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </TableScroll>

              <div className="admin-vendors-footer">
                <span className="admin-vendors-footer-count">
                  {totalItems === 1 ? "1 vendor" : `${totalItems} vendors`}
                </span>
                {showPager ? (
                  <div className="admin-vendors-footer-actions">
                    <button
                      aria-label="Previous page"
                      className="secondary-button compact"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      type="button"
                    >
                      ← Previous
                    </button>
                    <span className="admin-vendors-footer-pageinfo">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      aria-label="Next page"
                      className="secondary-button compact"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      type="button"
                    >
                      Next →
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {viewingVendor ? (
        <VendorDetailModal
          key={viewingVendor.id || viewingVendor.slug || "vendor-detail"}
          vendor={viewingVendor}
          onClose={() => setViewingVendor(null)}
        />
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
