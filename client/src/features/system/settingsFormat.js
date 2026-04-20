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

function getCurrency(settings) {
  return settings?.currency || DEFAULT_SETTINGS.currency;
}

function getPreferences(settings) {
  return settings?.preferences || DEFAULT_SETTINGS.preferences;
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

function dateFormatOptions(format) {
  switch (format) {
    case "iso":
      return null;
    case "long":
      return { day: "numeric", month: "long", year: "numeric" };
    case "medium":
    default:
      return { day: "numeric", month: "short", year: "numeric" };
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

    if (format === "iso") {
      return date.toISOString().slice(0, 10);
    }

    return new Intl.DateTimeFormat(undefined, dateFormatOptions(format)).format(date);
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

    if (format === "iso") {
      const iso = date.toISOString();
      return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
    }

    const baseOptions = dateFormatOptions(format) || {
      day: "numeric",
      month: "short",
      year: "numeric"
    };

    return new Intl.DateTimeFormat(undefined, {
      ...baseOptions,
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
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
  getCurrency,
  getDefaultPageSize,
  getPreferences,
  shouldConfirmDestructive,
  shouldShowNotificationsBadge
};
