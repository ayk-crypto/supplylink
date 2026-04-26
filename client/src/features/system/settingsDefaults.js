const LEGACY_STORAGE_KEY = "supplylink.settings.v1";

const DEFAULT_SETTINGS = {
  company: {
    legalName: "",
    displayName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    taxId: "",
    primaryBrandColor: "",
    logoUrl: ""
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
    code: "PKR",
    decimals: 2,
    thousandsSeparator: ","
  },
  preferences: {
    dateFormat: "YYYY-MM-DD",
    defaultPageSize: 20,
    notificationsBadgeEnabled: true,
    confirmDestructiveActions: true
  }
};

const LEGACY_COMPANY_FIELD_ALIASES = {
  contactEmail: "email",
  contactPhone: "phone"
};

const ALLOWED_DATE_FORMATS = new Set(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]);
const ALLOWED_THOUSANDS_SEPARATORS = new Set([",", ".", " ", "'", ""]);

function mergeSettings(...sources) {
  const result = {
    company: { ...DEFAULT_SETTINGS.company },
    invoice: { ...DEFAULT_SETTINGS.invoice },
    currency: { ...DEFAULT_SETTINGS.currency },
    preferences: { ...DEFAULT_SETTINGS.preferences }
  };

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const section of Object.keys(result)) {
      const incoming = source[section];

      if (incoming && typeof incoming === "object") {
        for (const [rawKey, rawValue] of Object.entries(incoming)) {
          if (rawValue === undefined || rawValue === null) continue;
          const key =
            section === "company" && LEGACY_COMPANY_FIELD_ALIASES[rawKey]
              ? LEGACY_COMPANY_FIELD_ALIASES[rawKey]
              : rawKey;
          if (key in result[section]) {
            result[section][key] = rawValue;
          }
        }
      }
    }
  }

  return result;
}

function readLegacySettings() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLegacySettings() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore — best effort cleanup
  }
}

function trimString(value, max) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return Number.isFinite(max) ? trimmed.slice(0, max) : trimmed;
}

function clampInt(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.trunc(numeric);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function buildCompanyPayload(company) {
  if (!company || typeof company !== "object") return null;
  const payload = {
    displayName: trimString(company.displayName, 200),
    legalName: trimString(company.legalName, 200),
    email: trimString(company.email, 320),
    phone: trimString(company.phone, 50),
    taxId: trimString(company.taxId, 100),
    addressLine1: trimString(company.addressLine1, 250),
    addressLine2: trimString(company.addressLine2, 250)
  };
  const brandColor = trimString(company.primaryBrandColor, 7);
  if (brandColor === "" || /^#[0-9A-Fa-f]{6}$/.test(brandColor)) {
    payload.primaryBrandColor = brandColor;
  }
  return payload;
}

function buildInvoicePayload(invoice) {
  if (!invoice || typeof invoice !== "object") return null;
  return {
    prefix: trimString(invoice.prefix, 20),
    suffix: trimString(invoice.suffix, 20),
    nextNumber: clampInt(invoice.nextNumber, 1, 999999999, 1),
    padding: clampInt(invoice.padding, 1, 12, 1),
    defaultDueDays: clampInt(invoice.defaultDueDays, 0, 365, 0),
    defaultNotes: trimString(invoice.defaultNotes, 5000)
  };
}

function buildCurrencyPayload(currency) {
  if (!currency || typeof currency !== "object") return null;
  const codeRaw = trimString(currency.code, 3);
  const code = /^[A-Za-z]{3}$/.test(codeRaw) ? codeRaw.toUpperCase() : "PKR";
  const sepRaw = typeof currency.thousandsSeparator === "string"
    ? currency.thousandsSeparator
    : ",";
  const thousandsSeparator = ALLOWED_THOUSANDS_SEPARATORS.has(sepRaw) ? sepRaw : ",";
  return {
    code,
    decimals: clampInt(currency.decimals, 0, 4, 2),
    thousandsSeparator
  };
}

function buildPreferencesPayload(preferences) {
  if (!preferences || typeof preferences !== "object") return null;
  const dateFormat = ALLOWED_DATE_FORMATS.has(preferences.dateFormat)
    ? preferences.dateFormat
    : "YYYY-MM-DD";
  return {
    dateFormat,
    defaultPageSize: clampInt(preferences.defaultPageSize, 5, 100, 20),
    notificationsBadgeEnabled: Boolean(preferences.notificationsBadgeEnabled),
    confirmDestructiveActions: Boolean(preferences.confirmDestructiveActions)
  };
}

function toBackendPayload(settings) {
  const merged = mergeSettings(DEFAULT_SETTINGS, settings);
  return {
    company: buildCompanyPayload(merged.company),
    invoice: buildInvoicePayload(merged.invoice),
    currency: buildCurrencyPayload(merged.currency),
    preferences: buildPreferencesPayload(merged.preferences)
  };
}

function stripServerManagedBranding(settings) {
  if (!settings || typeof settings !== "object") {
    return settings;
  }
  const next = { ...settings };
  if (next.company && typeof next.company === "object") {
    next.company = { ...next.company };
    delete next.company.logoUrl;
    delete next.company.logo;
  }
  return next;
}

export {
  ALLOWED_DATE_FORMATS,
  DEFAULT_SETTINGS,
  LEGACY_STORAGE_KEY,
  clearLegacySettings,
  mergeSettings,
  readLegacySettings,
  stripServerManagedBranding,
  toBackendPayload
};
