import { DEFAULT_SETTINGS } from "./settingsDefaults.js";

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  PKR: "₨",
  JPY: "¥"
};

let activeSettings = DEFAULT_SETTINGS;

function setActiveSettings(settings) {
  activeSettings = settings || DEFAULT_SETTINGS;
}

function getActiveSettings() {
  return activeSettings;
}

function getCurrency(settings) {
  return settings?.currency || DEFAULT_SETTINGS.currency;
}

function getPreferences(settings) {
  return settings?.preferences || DEFAULT_SETTINGS.preferences;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isValidHexColor(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value.trim());
}

function getBrandColor(settings) {
  const raw = settings?.company?.primaryBrandColor;
  return isValidHexColor(raw) ? raw.trim() : "";
}

function getLogoUrl(settings) {
  const raw = settings?.company?.logoUrl;
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }
  const logo = settings?.company?.logo;
  if (logo && typeof logo === "object") {
    if (typeof logo.url === "string" && logo.url.trim()) return logo.url.trim();
    if (typeof logo.dataUrl === "string" && logo.dataUrl.trim()) return logo.dataUrl.trim();
  }
  return "";
}

function getCompanyInitials(settings) {
  const company = settings?.company || DEFAULT_SETTINGS.company;
  const source = company.displayName || company.legalName || "S";
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() || "").join("");
  return initials || "S";
}

function clampDecimals(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 2;
  return Math.max(0, Math.min(4, Math.trunc(num)));
}

function formatMoneyWith(settings, value) {
  const currency = getCurrency(settings);
  const decimals = clampDecimals(currency.decimals);
  const symbol = CURRENCY_SYMBOLS[currency.code] || currency.code || "";
  const numeric = Number(value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const sample = safe.toFixed(decimals);
  const [whole, fractional] = sample.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator || "");
  const display = fractional ? `${grouped}.${fractional}` : grouped;
  return `${symbol}${display}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDatePattern(date, format) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  switch (format) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

function formatDateWith(settings, value) {
  if (!value) return "—";

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const format = getPreferences(settings).dateFormat;
    return formatDatePattern(date, format);
  } catch {
    return String(value);
  }
}

function formatDateTimeWith(settings, value) {
  if (!value) return "—";

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const format = getPreferences(settings).dateFormat;
    const datePart = formatDatePattern(date, format);
    const timePart = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
    return `${datePart} ${timePart}`;
  } catch {
    return String(value);
  }
}

function confirmDestructive(settings, message) {
  if (!shouldConfirmDestructive(settings)) {
    return true;
  }
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }
  return window.confirm(message);
}

function getDefaultPageSize(settings, fallback = 10) {
  const preferences = getPreferences(settings);
  const value = Number(preferences.defaultPageSize);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.min(200, Math.max(1, Math.trunc(value)));
}

function shouldShowNotificationsBadge(settings) {
  const preferences = getPreferences(settings);
  return preferences.notificationsBadgeEnabled !== false;
}

function shouldConfirmDestructive(settings) {
  const preferences = getPreferences(settings);
  return preferences.confirmDestructiveActions !== false;
}

export {
  CURRENCY_SYMBOLS,
  confirmDestructive,
  formatDateTimeWith,
  formatDateWith,
  formatMoneyWith,
  getActiveSettings,
  getBrandColor,
  getCompanyInitials,
  getCurrency,
  getDefaultPageSize,
  getLogoUrl,
  getPreferences,
  isValidHexColor,
  setActiveSettings,
  shouldConfirmDestructive,
  shouldShowNotificationsBadge
};
