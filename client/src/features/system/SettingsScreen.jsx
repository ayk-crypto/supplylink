import { useEffect, useMemo, useRef, useState } from "react";
import {
  ErrorState,
  Field,
  LoadingState,
  PageHeader
} from "../../components/ui/ResourceScreens.jsx";
import {
  deleteVendorLogo,
  fetchVendorLogoBlob,
  uploadVendorLogo
} from "../../services/settingsApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useAppSettings } from "./settingsContext.js";
import { DEFAULT_SETTINGS, mergeSettings } from "./settingsDefaults.js";
import {
  CURRENCY_SYMBOLS,
  confirmDestructive,
  formatMoneyWith,
  getBrandColor,
  getCompanyInitials,
  getLogoUrl,
  isValidHexColor
} from "./settingsFormat.js";

const DEFAULT_BRAND_COLOR_PLACEHOLDER = "#2563eb";

const DATE_FORMAT_OPTIONS = [
  { value: "YYYY-MM-DD", label: "ISO (2026-04-20)" },
  { value: "DD/MM/YYYY", label: "European (20/04/2026)" },
  { value: "MM/DD/YYYY", label: "US (04/20/2026)" }
];

const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD) — $" },
  { value: "EUR", label: "Euro (EUR) — €" },
  { value: "GBP", label: "British Pound (GBP) — £" },
  { value: "INR", label: "Indian Rupee (INR) — ₹" },
  { value: "AED", label: "UAE Dirham (AED) — د.إ" },
  { value: "PKR", label: "Pakistani Rupee (PKR) — ₨" },
  { value: "JPY", label: "Japanese Yen (JPY) — ¥" }
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function buildInvoiceNumberPreview(invoice) {
  const padding = Math.max(1, Math.min(12, Number(invoice.padding) || 1));
  const next = Math.max(1, Number(invoice.nextNumber) || 1);
  const padded = String(next).padStart(padding, "0");
  return `${invoice.prefix || ""}${padded}${invoice.suffix || ""}`;
}

function SettingsScreen() {
  const { showToast } = useToast();
  const {
    error: loadError,
    isHydrated,
    isLoading,
    refresh,
    save,
    settings: providerSettings
  } = useAppSettings();
  const [draft, setDraft] = useState(providerSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const [brandColorError, setBrandColorError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDraft(providerSettings);
  }, [providerSettings]);

  function updateSection(section, field, value) {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value }
    }));
  }

  const invoicePreview = useMemo(
    () => buildInvoiceNumberPreview(draft.invoice),
    [draft.invoice]
  );
  const currencyPreview = useMemo(
    () => formatMoneyWith(draft, 12345.6),
    [draft]
  );

  async function handleSave(event) {
    event.preventDefault();
    const colorRaw = (draft.company.primaryBrandColor || "").trim();
    if (colorRaw && !isValidHexColor(colorRaw)) {
      setBrandColorError("Use a 6-digit hex color like #2563EB.");
      showToast({
        message: "Brand color must be a valid hex (#rgb or #rrggbb).",
        title: "Save failed",
        tone: "error"
      });
      return;
    }
    setBrandColorError("");
    setIsSaving(true);
    try {
      await save(draft);
      showToast({
        message: "Your settings are saved for everyone in this workspace.",
        title: "Settings updated",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "We could not save your settings."),
        title: "Save failed",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (!confirmDestructive(providerSettings, "Reset all settings to the SupplyLink defaults?")) {
      return;
    }

    setIsSaving(true);
    try {
      const restored = await save(DEFAULT_SETTINGS);
      setDraft(restored);
      showToast({
        message: "Settings restored to defaults.",
        title: "Defaults restored",
        tone: "info"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "We could not reset your settings."),
        title: "Reset failed",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReload() {
    try {
      const next = await refresh();
      setDraft(mergeSettings(DEFAULT_SETTINGS, next));
    } catch {
      // refresh already surfaces error in context state
    }
  }

  const logoInitials = getCompanyInitials(draft);
  const currentLogoUrl = getLogoUrl(providerSettings);
  const [logoObjectUrl, setLogoObjectUrl] = useState("");

  useEffect(() => {
    if (!currentLogoUrl) {
      setLogoObjectUrl("");
      return undefined;
    }

    let cancelled = false;
    let createdUrl = "";
    const controller = new AbortController();

    fetchVendorLogoBlob({ signal: controller.signal })
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setLogoObjectUrl(createdUrl);
      })
      .catch((requestError) => {
        if (cancelled || requestError?.name === "AbortError") return;
        setLogoObjectUrl("");
      });

    return () => {
      cancelled = true;
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [currentLogoUrl]);
  const previewBrandColor = isValidHexColor(draft.company.primaryBrandColor)
    ? draft.company.primaryBrandColor.trim()
    : "";

  function handlePickLogo() {
    fileInputRef.current?.click();
  }

  async function handleLogoFileChange(event) {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast({
        message: "Choose an image file (PNG, JPG, or SVG).",
        title: "Unsupported file",
        tone: "error"
      });
      return;
    }
    setIsUploadingLogo(true);
    try {
      await uploadVendorLogo(file);
      const next = await refresh();
      setDraft((current) => ({
        ...current,
        company: {
          ...current.company,
          logoUrl: next?.company?.logoUrl ?? ""
        }
      }));
      showToast({
        message: "Workspace logo updated.",
        title: "Logo uploaded",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Logo could not be uploaded."
        ),
        title: "Upload failed",
        tone: "error"
      });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    if (
      !confirmDestructive(
        providerSettings,
        "Remove the workspace logo? Initials will be shown until a new logo is uploaded."
      )
    ) {
      return;
    }
    setIsRemovingLogo(true);
    try {
      await deleteVendorLogo();
      const next = await refresh();
      setDraft((current) => ({
        ...current,
        company: {
          ...current.company,
          logoUrl: next?.company?.logoUrl ?? ""
        }
      }));
      showToast({
        message: "Workspace logo removed.",
        title: "Logo removed",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Logo could not be removed."
        ),
        title: "Remove failed",
        tone: "error"
      });
    } finally {
      setIsRemovingLogo(false);
    }
  }

  const description = isHydrated
    ? "Configure how SupplyLink presents and numbers your business records. Changes are saved to your workspace."
    : "Loading the latest workspace settings…";

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button
              className="secondary-button"
              disabled={isSaving || isLoading}
              onClick={handleReset}
              type="button"
            >
              Reset to defaults
            </button>
            <button
              className="primary-button"
              disabled={isSaving || isLoading}
              form="settings-form"
              type="submit"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        }
        description={description}
        eyebrow="Workspace"
        title="Settings"
      />

      {loadError ? (
        <ErrorState message={loadError} onRetry={handleReload} />
      ) : null}

      {isLoading && !isHydrated ? (
        <LoadingState>Loading settings…</LoadingState>
      ) : null}

      <form id="settings-form" onSubmit={handleSave}>
        <section className="transaction-panel">
          <div className="panel-heading">
            <h3>Company info</h3>
            <span>Used on invoices, quotations, and printed documents.</span>
          </div>
          <div className="settings-company-row">
            <div
              className="settings-logo-tile"
              style={
                previewBrandColor
                  ? { borderColor: previewBrandColor }
                  : undefined
              }
            >
              {currentLogoUrl && logoObjectUrl ? (
                <img alt="Workspace logo" src={logoObjectUrl} />
              ) : (
                <span
                  aria-hidden="true"
                  className="settings-logo-placeholder"
                  style={
                    previewBrandColor
                      ? { background: previewBrandColor, color: "#fff" }
                      : undefined
                  }
                >
                  {logoInitials}
                </span>
              )}
            </div>
            <div className="settings-branding-controls">
              <p className="muted">
                Your workspace logo appears in invoices, printed documents, and
                the workspace header. PNG, JPG, or SVG up to a few hundred KB
                works best.
              </p>
              <div className="button-row" style={{ justifyContent: "flex-start" }}>
                <button
                  className="secondary-button"
                  disabled={isUploadingLogo || isRemovingLogo}
                  onClick={handlePickLogo}
                  type="button"
                >
                  {isUploadingLogo
                    ? "Uploading…"
                    : currentLogoUrl
                    ? "Replace logo"
                    : "Upload logo"}
                </button>
                {currentLogoUrl ? (
                  <button
                    className="secondary-button"
                    disabled={isUploadingLogo || isRemovingLogo}
                    onClick={handleRemoveLogo}
                    type="button"
                  >
                    {isRemovingLogo ? "Removing…" : "Remove logo"}
                  </button>
                ) : null}
              </div>
              <input
                accept="image/*"
                className="visually-hidden"
                onChange={handleLogoFileChange}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </div>
          <div className="form-grid">
            <Field
              error={brandColorError}
              hint="Used as an accent on invoices and the workspace header. Hex like #2563eb."
              label="Primary brand color"
            >
              <div className="brand-color-row">
                <input
                  aria-label="Brand color picker"
                  className="brand-color-swatch-input"
                  onChange={(event) =>
                    updateSection(
                      "company",
                      "primaryBrandColor",
                      event.target.value
                    )
                  }
                  type="color"
                  value={
                    isValidHexColor(draft.company.primaryBrandColor)
                      ? draft.company.primaryBrandColor
                      : DEFAULT_BRAND_COLOR_PLACEHOLDER
                  }
                />
                <input
                  maxLength={7}
                  onChange={(event) => {
                    if (brandColorError) setBrandColorError("");
                    updateSection(
                      "company",
                      "primaryBrandColor",
                      event.target.value
                    );
                  }}
                  placeholder={DEFAULT_BRAND_COLOR_PLACEHOLDER}
                  type="text"
                  value={draft.company.primaryBrandColor || ""}
                />
                {draft.company.primaryBrandColor ? (
                  <button
                    className="secondary-button compact"
                    onClick={() =>
                      updateSection("company", "primaryBrandColor", "")
                    }
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Display name">
              <input
                onChange={(event) => updateSection("company", "displayName", event.target.value)}
                placeholder="SupplyLink Trading"
                type="text"
                value={draft.company.displayName}
              />
            </Field>
            <Field label="Legal name">
              <input
                onChange={(event) => updateSection("company", "legalName", event.target.value)}
                placeholder="SupplyLink Trading LLC"
                type="text"
                value={draft.company.legalName}
              />
            </Field>
            <Field label="Contact email">
              <input
                onChange={(event) => updateSection("company", "email", event.target.value)}
                placeholder="ops@yourcompany.com"
                type="email"
                value={draft.company.email}
              />
            </Field>
            <Field label="Contact phone">
              <input
                onChange={(event) => updateSection("company", "phone", event.target.value)}
                placeholder="+1 555 0100"
                type="tel"
                value={draft.company.phone}
              />
            </Field>
            <Field label="Tax / VAT ID">
              <input
                onChange={(event) => updateSection("company", "taxId", event.target.value)}
                type="text"
                value={draft.company.taxId}
              />
            </Field>
            <Field label="Address line 1">
              <input
                onChange={(event) => updateSection("company", "addressLine1", event.target.value)}
                type="text"
                value={draft.company.addressLine1}
              />
            </Field>
            <Field label="Address line 2">
              <input
                onChange={(event) => updateSection("company", "addressLine2", event.target.value)}
                type="text"
                value={draft.company.addressLine2}
              />
            </Field>
          </div>
        </section>

        <section className="transaction-panel">
          <div className="panel-heading">
            <h3>Invoice settings</h3>
            <span>Next invoice will be numbered: <strong>{invoicePreview}</strong></span>
          </div>
          <div className="form-grid">
            <Field hint="Leading text such as INV-" label="Prefix">
              <input
                maxLength={10}
                onChange={(event) => updateSection("invoice", "prefix", event.target.value)}
                type="text"
                value={draft.invoice.prefix}
              />
            </Field>
            <Field hint="Optional trailing text" label="Suffix">
              <input
                maxLength={10}
                onChange={(event) => updateSection("invoice", "suffix", event.target.value)}
                type="text"
                value={draft.invoice.suffix}
              />
            </Field>
            <Field label="Next number">
              <input
                min={1}
                onChange={(event) =>
                  updateSection("invoice", "nextNumber", Number(event.target.value) || 0)
                }
                step={1}
                type="number"
                value={draft.invoice.nextNumber}
              />
            </Field>
            <Field hint="Leading zeros, e.g. 4 → 0001" label="Number padding">
              <input
                max={12}
                min={1}
                onChange={(event) =>
                  updateSection("invoice", "padding", Number(event.target.value) || 1)
                }
                step={1}
                type="number"
                value={draft.invoice.padding}
              />
            </Field>
            <Field hint="Default due date offset on new invoices" label="Default due (days)">
              <input
                min={0}
                onChange={(event) =>
                  updateSection("invoice", "defaultDueDays", Number(event.target.value) || 0)
                }
                step={1}
                type="number"
                value={draft.invoice.defaultDueDays}
              />
            </Field>
            <Field label="Default notes">
              <textarea
                onChange={(event) => updateSection("invoice", "defaultNotes", event.target.value)}
                placeholder="Thank you for your business."
                rows={3}
                value={draft.invoice.defaultNotes}
              />
            </Field>
          </div>
        </section>

        <section className="transaction-panel">
          <div className="panel-heading">
            <h3>Currency display</h3>
            <span>Sample: <strong>{currencyPreview}</strong></span>
          </div>
          <div className="form-grid">
            <Field label="Currency">
              <select
                onChange={(event) => updateSection("currency", "code", event.target.value)}
                value={draft.currency.code}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {CURRENCY_SYMBOLS[draft.currency.code] ? null : (
                  <option value={draft.currency.code}>{draft.currency.code}</option>
                )}
              </select>
            </Field>
            <Field label="Decimal places">
              <input
                max={4}
                min={0}
                onChange={(event) =>
                  updateSection("currency", "decimals", Number(event.target.value) || 0)
                }
                step={1}
                type="number"
                value={draft.currency.decimals}
              />
            </Field>
            <Field hint="Character used between thousands (e.g. , or .)" label="Thousands separator">
              <input
                maxLength={1}
                onChange={(event) =>
                  updateSection("currency", "thousandsSeparator", event.target.value)
                }
                type="text"
                value={draft.currency.thousandsSeparator}
              />
            </Field>
          </div>
        </section>

        <section className="transaction-panel">
          <div className="panel-heading">
            <h3>Preferences</h3>
            <span>Personal display preferences for this workspace.</span>
          </div>
          <div className="form-grid">
            <Field label="Date format">
              <select
                onChange={(event) => updateSection("preferences", "dateFormat", event.target.value)}
                value={draft.preferences.dateFormat}
              >
                {DATE_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default page size">
              <select
                onChange={(event) =>
                  updateSection(
                    "preferences",
                    "defaultPageSize",
                    Number(event.target.value) || 20
                  )
                }
                value={draft.preferences.defaultPageSize}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} per page
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notifications badge">
              <label className="settings-toggle">
                <input
                  checked={draft.preferences.notificationsBadgeEnabled}
                  onChange={(event) =>
                    updateSection(
                      "preferences",
                      "notificationsBadgeEnabled",
                      event.target.checked
                    )
                  }
                  type="checkbox"
                />
                <span>Show unread badge on the bell icon</span>
              </label>
            </Field>
            <Field label="Destructive action confirmation">
              <label className="settings-toggle">
                <input
                  checked={draft.preferences.confirmDestructiveActions}
                  onChange={(event) =>
                    updateSection(
                      "preferences",
                      "confirmDestructiveActions",
                      event.target.checked
                    )
                  }
                  type="checkbox"
                />
                <span>Confirm before cancel, void, or delete actions</span>
              </label>
            </Field>
          </div>
        </section>

        <div className="form-actions">
          <button
            className="secondary-button"
            disabled={isSaving || isLoading}
            onClick={handleReset}
            type="button"
          >
            Reset to defaults
          </button>
          <button className="primary-button" disabled={isSaving || isLoading} type="submit">
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsScreen;
