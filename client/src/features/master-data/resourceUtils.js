function getApiErrorMessage(error, fallback = "The request could not be completed.") {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const detail = error.payload?.details?.[0]?.message;

  return detail || error.message || fallback;
}

function cleanOptional(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function cleanRequired(value) {
  return typeof value === "string" ? value.trim() : value;
}

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidSlug(value) {
  if (!value) {
    return true;
  }

  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function toMoney(value) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat(undefined, {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(amount);
}

export { cleanOptional, cleanRequired, getApiErrorMessage, isValidEmail, isValidSlug, toMoney };
