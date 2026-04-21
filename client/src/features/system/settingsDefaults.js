const LEGACY_STORAGE_KEY = "supplylink.settings.v1";

const DEFAULT_SETTINGS = {
  company: {
    legalName: "",
    displayName: "",
    contactEmail: "",
    contactPhone: "",
    addressLine1: "",
    addressLine2: "",
    taxId: "",
    primaryBrandColor: "",
    logoUrl: "",
    logo: null
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
        for (const key of Object.keys(result[section])) {
          if (incoming[key] !== undefined && incoming[key] !== null) {
            result[section][key] = incoming[key];
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
  DEFAULT_SETTINGS,
  LEGACY_STORAGE_KEY,
  clearLegacySettings,
  mergeSettings,
  readLegacySettings,
  stripServerManagedBranding
};
