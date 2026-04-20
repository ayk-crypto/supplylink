import AppError from "../../core/errors/AppError.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import { findVendorSettings, upsertVendorSettings } from "./settings.repository.js";

const DEFAULT_SETTINGS = {
  company: {
    displayName: "",
    legalName: "",
    email: "",
    phone: "",
    taxId: "",
    addressLine1: "",
    addressLine2: "",
    logoUrl: ""
  },
  invoice: {
    prefix: "INV",
    suffix: "",
    nextNumber: 1,
    padding: 5,
    defaultDueDays: 30,
    defaultNotes: ""
  },
  currency: {
    code: "USD",
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

function deepMerge(base, override = {}) {
  const merged = { ...base };

  Object.entries(override || {}).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      merged[key] = deepMerge(base[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function compactSettingsForStorage(settings) {
  return {
    company: settings.company,
    invoice: settings.invoice,
    currency: settings.currency,
    preferences: settings.preferences
  };
}

function defaultsForVendor(row) {
  return deepMerge(DEFAULT_SETTINGS, {
    company: {
      displayName: row.display_name || "",
      legalName: row.legal_name || "",
      email: row.contact_email || "",
      phone: row.contact_phone || ""
    },
    currency: {
      code: row.currency_code || DEFAULT_SETTINGS.currency.code
    }
  });
}

function mapSettings(row) {
  const defaults = defaultsForVendor(row);
  const settings = deepMerge(defaults, row.settings || {});

  return {
    vendorId: row.vendor_id,
    settings,
    sections: settings,
    defaults,
    isDefault: !row.settings,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertSettingsFound(row, vendorId) {
  if (!row) {
    throw new AppError("Vendor not found", {
      statusCode: 404,
      code: "VENDOR_NOT_FOUND",
      details: [
        {
          path: "vendorId",
          message: `No vendor was found for ${vendorId}`
        }
      ]
    });
  }
}

function changedSections(before, after) {
  return Object.keys(DEFAULT_SETTINGS).filter(
    (section) => JSON.stringify(before[section]) !== JSON.stringify(after[section])
  );
}

async function getTenantSettings(vendorId) {
  const row = await findVendorSettings(vendorId);

  assertSettingsFound(row, vendorId);

  return mapSettings(row);
}

async function updateTenantSettings(vendorId, payload, actor = {}) {
  const existingRow = await findVendorSettings(vendorId);

  assertSettingsFound(existingRow, vendorId);

  const current = mapSettings(existingRow);
  const mergedSettings = compactSettingsForStorage(deepMerge(current.settings, payload));
  const saved = await upsertVendorSettings(vendorId, mergedSettings);
  const updated = {
    ...current,
    settings: saved.settings,
    sections: saved.settings,
    isDefault: false,
    createdAt: saved.created_at,
    updatedAt: saved.updated_at
  };
  const changed = changedSections(current.settings, updated.settings);

  await recordAuditEvent({
    vendorId,
    actor,
    entityType: "settings",
    entityId: vendorId,
    eventType: "settings.updated",
    eventLabel: "Tenant settings were updated.",
    metadata: {
      vendorId,
      changedSections: changed
    }
  });

  return updated;
}

export { getTenantSettings, updateTenantSettings };
