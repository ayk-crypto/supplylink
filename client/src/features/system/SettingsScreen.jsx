import { useEffect, useMemo, useState } from "react";
import {
  ErrorState,
  Field,
  LoadingState,
  PageHeader
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useAppSettings } from "./settingsContext.js";
import { DEFAULT_SETTINGS, mergeSettings } from "./settingsDefaults.js";
import {
  CURRENCY_SYMBOLS,
  confirmDestructive,
  formatMoneyWith
} from "./settingsFormat.js";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD) — $" },
  { value: "EUR", label: "Euro (EUR) — €" },
  { value: "GBP", label: "British Pound (GBP) — £" },
  { value: "INR", label: "Indian Rupee (INR) — ₹" },
  { value: "AED", label: "UAE Dirham (AED) — د.إ" },
  { value: "PKR", label: "Pakistani Rupee (PKR) — ₨" },
  { value: "JPY", label: "Japanese Yen (JPY) — ¥" }
];

const DATE_FORMAT_OPTIONS = [
  { value: "iso", label: "ISO (2026-04-20)" },
  { value: "medium", label: "Medium (Apr 20, 2026)" },
  { value: "long", label: "Long (April 20, 2026)" }
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function buildInvoiceNumberPreview(invoice) {
  const padding = Math.max(0, Math.min(10, Number(invoice.padding) || 0));
  const next = Number(invoice.nextNumber) || 0;
  const padded = padding > 0 ? String(next).padStart(padding, "0") : String(next);
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

  const logoInitials = (draft.company.displayName || draft.company.legalName || "S")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "S";

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
            <div aria-hidden="true" className="settings-logo-placeholder">
              {logoInitials}
            </div>
            <p className="muted">
              Logo upload arrives with the backend asset endpoint. The initials above will be
              replaced with your uploaded mark.
            </p>
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
                onChange={(event) => updateSection("company", "contactEmail", event.target.value)}
                placeholder="ops@yourcompany.com"
                type="email"
                value={draft.company.contactEmail}
              />
            </Field>
            <Field label="Contact phone">
              <input
                onChange={(event) => updateSection("company", "contactPhone", event.target.value)}
                placeholder="+1 555 0100"
                type="tel"
                value={draft.company.contactPhone}
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
                max={10}
                min={0}
                onChange={(event) =>
                  updateSection("invoice", "padding", Number(event.target.value) || 0)
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
