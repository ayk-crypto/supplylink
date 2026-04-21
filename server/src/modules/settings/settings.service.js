import AppError from "../../core/errors/AppError.js";
import { deleteLocalFile, getLocalFilePath, saveLocalFile } from "../files/files.storage.js";
import { recordAuditEvent } from "../audit/audit.service.js";
import {
  SETTINGS_LOGO_ALLOWED_MIME_TYPES,
  SETTINGS_LOGO_PATH
} from "./settings.constants.js";
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
    logoUrl: "",
    primaryBrandColor: "",
    logo: null,
    logoStorage: null
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

function normalizePrimaryBrandColor(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function sanitizeCompanySettings(company = {}) {
  const sanitized = {
    ...company,
    primaryBrandColor: normalizePrimaryBrandColor(company.primaryBrandColor),
    logoUrl: company.logoUrl || ""
  };
  const managedLogo = sanitized.logoStorage?.storageKey
    ? {
        ...(sanitized.logo || {}),
        downloadUrl: SETTINGS_LOGO_PATH
      }
    : sanitized.logo && typeof sanitized.logo === "object" && !Array.isArray(sanitized.logo)
      ? sanitized.logo
      : null;

  sanitized.logo = managedLogo;
  delete sanitized.logoStorage;

  return sanitized;
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
  defaults.company = sanitizeCompanySettings(defaults.company);
  const settings = deepMerge(defaults, row.settings || {});
  settings.company = sanitizeCompanySettings(settings.company);

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

async function loadRawSettingsOrThrow(vendorId) {
  const row = await findVendorSettings(vendorId);

  assertSettingsFound(row, vendorId);
  const defaults = defaultsForVendor(row);

  return {
    row,
    defaults,
    storedSettings: deepMerge(defaults, row.settings || {})
  };
}

function assertLogoFile(file) {
  if (!file) {
    throw new AppError("A logo file is required", {
      statusCode: 422,
      code: "LOGO_FILE_REQUIRED",
      details: [{ path: "file", message: "Attach a multipart file field named file" }]
    });
  }

  if (!SETTINGS_LOGO_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError("Unsupported logo file type", {
      statusCode: 422,
      code: "UNSUPPORTED_LOGO_FILE_TYPE",
      details: [
        {
          path: "file",
          message: `Allowed mime types: ${SETTINGS_LOGO_ALLOWED_MIME_TYPES.join(", ")}`
        }
      ]
    });
  }
}

function createManagedLogoSettings(file, storedFile) {
  return {
    logoUrl: SETTINGS_LOGO_PATH,
    logo: {
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date().toISOString()
    },
    logoStorage: {
      storageBackend: storedFile.storageBackend,
      storageKey: storedFile.storageKey,
      storedFilename: storedFile.storedFilename
    }
  };
}

async function bestEffortDeleteManagedLogo(company = {}) {
  const storageKey = company.logoStorage?.storageKey;

  if (!storageKey || company.logoStorage?.storageBackend !== "local") {
    return;
  }

  try {
    await deleteLocalFile(storageKey);
  } catch (error) {
    console.error("Failed to delete previous workspace logo", error);
  }
}

async function getTenantSettings(vendorId) {
  const row = await findVendorSettings(vendorId);

  assertSettingsFound(row, vendorId);

  return mapSettings(row);
}

async function updateTenantSettings(vendorId, payload, actor = {}) {
  const { row: existingRow, storedSettings } = await loadRawSettingsOrThrow(vendorId);
  const current = mapSettings(existingRow);
  const mergedSettings = compactSettingsForStorage(deepMerge(storedSettings, payload));
  const saved = await upsertVendorSettings(vendorId, mergedSettings);
  const updated = mapSettings({
    ...existingRow,
    settings: saved.settings,
    created_at: saved.created_at,
    updated_at: saved.updated_at
  });
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

async function uploadTenantLogo(vendorId, file, actor = {}) {
  assertLogoFile(file);

  const { row, storedSettings } = await loadRawSettingsOrThrow(vendorId);
  const previousCompany = storedSettings.company || {};
  const storedFile = await saveLocalFile({
    vendorId,
    originalFilename: file.originalname,
    buffer: file.buffer
  });
  const nextSettings = compactSettingsForStorage({
    ...storedSettings,
    company: {
      ...storedSettings.company,
      ...createManagedLogoSettings(file, storedFile)
    }
  });

  try {
    const saved = await upsertVendorSettings(vendorId, nextSettings);
    await bestEffortDeleteManagedLogo(previousCompany);

    const updated = mapSettings({
      ...row,
      settings: saved.settings,
      created_at: saved.created_at,
      updated_at: saved.updated_at
    });

    await recordAuditEvent({
      vendorId,
      actor,
      entityType: "settings",
      entityId: vendorId,
      eventType: "settings.logo.updated",
      eventLabel: "Workspace logo was updated.",
      metadata: {
        vendorId,
        mimeType: file.mimetype,
        fileSize: file.size
      }
    });

    return updated;
  } catch (error) {
    await deleteLocalFile(storedFile.storageKey);
    throw error;
  }
}

async function getTenantLogo(vendorId) {
  const { storedSettings } = await loadRawSettingsOrThrow(vendorId);
  const company = storedSettings.company || {};
  const storage = company.logoStorage;

  if (!storage?.storageKey || storage.storageBackend !== "local") {
    throw new AppError("Workspace logo not found", {
      statusCode: 404,
      code: "WORKSPACE_LOGO_NOT_FOUND"
    });
  }

  if (!company.logo?.mimeType) {
    throw new AppError("Workspace logo metadata is incomplete", {
      statusCode: 500,
      code: "WORKSPACE_LOGO_INVALID"
    });
  }

  return {
    company: sanitizeCompanySettings(company),
    path: getLocalFilePath(storage.storageKey)
  };
}

async function removeTenantLogo(vendorId, actor = {}) {
  const { row, storedSettings } = await loadRawSettingsOrThrow(vendorId);
  const company = storedSettings.company || {};

  if (!company.logoStorage?.storageKey) {
    throw new AppError("Workspace logo not found", {
      statusCode: 404,
      code: "WORKSPACE_LOGO_NOT_FOUND"
    });
  }

  const nextSettings = compactSettingsForStorage({
    ...storedSettings,
    company: {
      ...storedSettings.company,
      logoUrl: "",
      logo: null,
      logoStorage: null
    }
  });
  const saved = await upsertVendorSettings(vendorId, nextSettings);
  await bestEffortDeleteManagedLogo(company);

  const updated = mapSettings({
    ...row,
    settings: saved.settings,
    created_at: saved.created_at,
    updated_at: saved.updated_at
  });

  await recordAuditEvent({
    vendorId,
    actor,
    entityType: "settings",
    entityId: vendorId,
    eventType: "settings.logo.deleted",
    eventLabel: "Workspace logo was removed.",
    metadata: {
      vendorId
    }
  });

  return updated;
}

export { getTenantLogo, getTenantSettings, removeTenantLogo, updateTenantSettings, uploadTenantLogo };
