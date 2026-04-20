import { useEffect, useMemo, useState } from "react";
import { Field, PageHeader } from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";

const STORAGE_KEY = "supplylink.settings.v1";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "US Dollar (USD) — $" },
  { value: "EUR", label: "Euro (EUR) — €" },
  { value: "GBP", label: "British Pound (GBP) — £" },
  { value: "INR", label: "Indian Rupee (INR) — ₹" },
  { value: "AED", label: "UAE Dirham (AED) — د.إ" },
  { value: "JPY", label: "Japanese Yen (JPY) — ¥" }
];

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  JPY: "¥"
};

const DATE_FORMAT_OPTIONS = [
  { value: "iso", label: "ISO (2026-04-20)" },
  { value: "medium", label: "Medium (Apr 20, 2026)" },
  { value: "long", label: "Long (April 20, 2026)" }
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DEFAULT_SETTINGS = {
  company: {
    legalName: "",
    displayName: "",
    contactEmail: "",
    contactPhone: "",
    addressLine1: "",
    addressLine2: "",
    taxId: ""
  },
  invoice: {
    prefix: "INV-",
    nextNumber: 1001,
    padding: 4,
    suffix: "",
    defaultDueDays: 30,
    defaultNotes: ""
  },
  currency: {
    code: "USD",
    decimals: 2,
    thousandsSeparator: ","
  },
  preferences: {
    dateFormat: "medium",
    defaultPageSize: 20,
    notificationsBadgeEnabled: true,
    confirmDestructiveActions: true
  }
};

function loadSettings() {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      company: { ...DEFAULT_SETTINGS.company, ...(parsed.company || {}) },
      invoice: { ...DEFAULT_SETTINGS.invoice, ...(parsed.invoice || {}) },
      currency: { ...DEFAULT_SETTINGS.currency, ...(parsed.currency || {}) },
      preferences: { ...DEFAULT_SETTINGS.preferences, ...(parsed.preferences || {}) }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function buildInvoiceNumberPreview(invoice) {
  const padding = Math.max(0, Math.min(10, Number(invoice.padding) || 0));
  const next = Number(invoice.nextNumber) || 0;
  const padded = padding > 0 ? String(next).padStart(padding, "0") : String(next);
  return `${invoice.prefix || ""}${padded}${invoice.suffix || ""}`;
}

function buildCurrencyPreview(currency) {
  const decimals = Math.max(0, Math.min(4, Number(currency.decimals) || 0));
  const symbol = CURRENCY_SYMBOLS[currency.code] || currency.code;
  const sample = (12345.6).toFixed(decimals);
  const [whole, fractional] = sample.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator || "");
  const display = fractional ? `${grouped}.${fractional}` : grouped;
  return `${symbol}${display}`;
}

function SettingsScreen() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(loadSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function updateSection(section, field, value) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value }
    }));
  }

  const invoicePreview = useMemo(
    () => buildInvoiceNumberPreview(settings.invoice),
    [settings.invoice]
  );
  const currencyPreview = useMemo(
    () => buildCurrencyPreview(settings.currency),
    [settings.currency]
  );

  function handleSave(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      saveSettings(settings);
      showToast({
        message: "Settings saved locally. Backend sync will arrive in a later module.",
        title: "Settings updated",
        tone: "success"
      });
    } catch {
      showToast({
        message: "We could not store your settings on this device.",
        title: "Save failed",
        tone: "error"
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    if (!window.confirm("Reset all settings to the SupplyLink defaults?")) {
      return;
    }
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    showToast({
      message: "Settings restored to defaults.",
      title: "Defaults restored",
      tone: "info"
    });
  }

  const logoInitials = (settings.company.displayName || settings.company.legalName || "S")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "S";

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button className="secondary-button" onClick={handleReset} type="button">
              Reset to defaults
            </button>
            <button
              className="primary-button"
              disabled={isSaving}
              form="settings-form"
              type="submit"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        }
        description="Configure how SupplyLink presents and numbers your business records. Stored on this device for now; backend sync arrives in a later module."
        eyebrow="Workspace"
        title="Settings"
      />

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
                value={settings.company.displayName}
              />
            </Field>
            <Field label="Legal name">
              <input
                onChange={(event) => updateSection("company", "legalName", event.target.value)}
                placeholder="SupplyLink Trading LLC"
                type="text"
                value={settings.company.legalName}
              />
            </Field>
            <Field label="Contact email">
              <input
                onChange={(event) => updateSection("company", "contactEmail", event.target.value)}
                placeholder="ops@yourcompany.com"
                type="email"
                value={settings.company.contactEmail}
              />
            </Field>
            <Field label="Contact phone">
              <input
                onChange={(event) => updateSection("company", "contactPhone", event.target.value)}
                placeholder="+1 555 0100"
                type="tel"
                value={settings.company.contactPhone}
              />
            </Field>
            <Field label="Tax / VAT ID">
              <input
                onChange={(event) => updateSection("company", "taxId", event.target.value)}
                type="text"
                value={settings.company.taxId}
              />
            </Field>
            <Field label="Address line 1">
              <input
                onChange={(event) => updateSection("company", "addressLine1", event.target.value)}
                type="text"
                value={settings.company.addressLine1}
              />
            </Field>
            <Field label="Address line 2">
              <input
                onChange={(event) => updateSection("company", "addressLine2", event.target.value)}
                type="text"
                value={settings.company.addressLine2}
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
                value={settings.invoice.prefix}
              />
            </Field>
            <Field hint="Optional trailing text" label="Suffix">
              <input
                maxLength={10}
                onChange={(event) => updateSection("invoice", "suffix", event.target.value)}
                type="text"
                value={settings.invoice.suffix}
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
                value={settings.invoice.nextNumber}
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
                value={settings.invoice.padding}
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
                value={settings.invoice.defaultDueDays}
              />
            </Field>
            <Field label="Default notes">
              <textarea
                onChange={(event) => updateSection("invoice", "defaultNotes", event.target.value)}
                placeholder="Thank you for your business."
                rows={3}
                value={settings.invoice.defaultNotes}
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
                value={settings.currency.code}
              >
                {CURRENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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
                value={settings.currency.decimals}
              />
            </Field>
            <Field hint="Character used between thousands (e.g. , or .)" label="Thousands separator">
              <input
                maxLength={1}
                onChange={(event) =>
                  updateSection("currency", "thousandsSeparator", event.target.value)
                }
                type="text"
                value={settings.currency.thousandsSeparator}
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
                value={settings.preferences.dateFormat}
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
                value={settings.preferences.defaultPageSize}
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
                  checked={settings.preferences.notificationsBadgeEnabled}
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
                  checked={settings.preferences.confirmDestructiveActions}
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
          <button className="secondary-button" onClick={handleReset} type="button">
            Reset to defaults
          </button>
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingsScreen;
