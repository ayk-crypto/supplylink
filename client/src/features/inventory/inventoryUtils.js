const LOW_STOCK_THRESHOLD = 5;

function toQuantity(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function formatQuantity(value) {
  const num = toQuantity(value);
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0
  }).format(num);
}

function stockTone(value) {
  const num = toQuantity(value);
  if (num < 0) return "negative";
  if (num === 0) return "out";
  if (num <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

function stockLabel(value) {
  const tone = stockTone(value);
  if (tone === "negative") return "Negative";
  if (tone === "out") return "Out of stock";
  if (tone === "low") return "Low stock";
  return "In stock";
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function movementToneFor(type) {
  if (type === "inbound") return "ok";
  if (type === "outbound") return "warn";
  return "neutral";
}

function signedQuantity(movement) {
  const qty = toQuantity(movement?.quantity);
  if (movement?.type === "outbound") {
    return -Math.abs(qty);
  }
  return qty;
}

export {
  LOW_STOCK_THRESHOLD,
  formatDateTime,
  formatQuantity,
  movementToneFor,
  signedQuantity,
  stockLabel,
  stockTone,
  toQuantity
};
