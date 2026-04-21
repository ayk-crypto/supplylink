import AppError from "../../core/errors/AppError.js";

const DISCOUNT_TYPES = ["flat", "percent"];

function toNumber(value) {
  return Number(value || 0);
}

function toCents(value) {
  return Math.round(toNumber(value) * 100);
}

function toMoney(cents) {
  return Number((cents / 100).toFixed(2));
}

function normalizeDiscountType(value) {
  if (!value) {
    return null;
  }

  return String(value).trim().toLowerCase();
}

function calculateDocumentPricing({
  items,
  discountType = null,
  discountValue = 0,
  taxEnabled = false,
  taxRate = 0,
  errorPathPrefix = "body"
}) {
  const normalizedDiscountType = normalizeDiscountType(discountType);
  const normalizedDiscountValue = toNumber(discountValue);
  const normalizedTaxEnabled = Boolean(taxEnabled);
  const normalizedTaxRate = toNumber(taxRate);

  if (normalizedDiscountType && !DISCOUNT_TYPES.includes(normalizedDiscountType)) {
    throw new AppError("Unsupported discount type", {
      statusCode: 422,
      code: "INVALID_DISCOUNT_TYPE",
      details: [
        {
          path: `${errorPathPrefix}.discountType`,
          message: `Discount type must be one of: ${DISCOUNT_TYPES.join(", ")}`
        }
      ]
    });
  }

  if (!normalizedDiscountType && normalizedDiscountValue > 0) {
    throw new AppError("discountType is required when discountValue is provided", {
      statusCode: 422,
      code: "DISCOUNT_TYPE_REQUIRED",
      details: [
        {
          path: `${errorPathPrefix}.discountType`,
          message: "Provide discountType when discountValue is greater than zero"
        }
      ]
    });
  }

  if (normalizedDiscountType === "percent" && normalizedDiscountValue > 100) {
    throw new AppError("Percent discount cannot exceed 100", {
      statusCode: 422,
      code: "INVALID_DISCOUNT_PERCENT",
      details: [
        {
          path: `${errorPathPrefix}.discountValue`,
          message: "Percent discount must be between 0 and 100"
        }
      ]
    });
  }

  if (!normalizedTaxEnabled && normalizedTaxRate > 0) {
    throw new AppError("taxEnabled must be true when taxRate is provided", {
      statusCode: 422,
      code: "TAX_RATE_REQUIRES_ENABLED",
      details: [
        {
          path: `${errorPathPrefix}.taxEnabled`,
          message: "Enable tax before providing a taxRate"
        }
      ]
    });
  }

  if (normalizedTaxEnabled && (normalizedTaxRate < 0 || normalizedTaxRate > 100)) {
    throw new AppError("Invalid tax rate", {
      statusCode: 422,
      code: "INVALID_TAX_RATE",
      details: [
        {
          path: `${errorPathPrefix}.taxRate`,
          message: "Tax rate must be between 0 and 100"
        }
      ]
    });
  }

  const subtotalCents = items.reduce((total, item) => total + item.subtotalCents, 0);
  const itemDiscountCents = items.reduce((total, item) => total + item.discountCents, 0);
  const itemTaxCents = items.reduce((total, item) => total + item.taxCents, 0);
  const postLineDiscountSubtotalCents = subtotalCents - itemDiscountCents;

  if (postLineDiscountSubtotalCents < 0) {
    throw new AppError("Line item discounts cannot exceed subtotal", {
      statusCode: 422,
      code: "INVALID_DISCOUNT_AMOUNT",
      details: [
        {
          path: `${errorPathPrefix}.discountValue`,
          message: "Document subtotal cannot be negative after line discounts"
        }
      ]
    });
  }

  let documentDiscountCents = 0;

  if (normalizedDiscountType === "percent") {
    documentDiscountCents = Math.round(postLineDiscountSubtotalCents * (normalizedDiscountValue / 100));
  } else if (normalizedDiscountType === "flat") {
    documentDiscountCents = toCents(normalizedDiscountValue);
  }

  if (documentDiscountCents > postLineDiscountSubtotalCents) {
    throw new AppError("Flat discount cannot exceed subtotal", {
      statusCode: 422,
      code: "INVALID_DISCOUNT_AMOUNT",
      details: [
        {
          path: `${errorPathPrefix}.discountValue`,
          message: "Flat discount cannot exceed the subtotal after line discounts"
        }
      ]
    });
  }

  const taxableSubtotalCents = postLineDiscountSubtotalCents - documentDiscountCents;
  const documentTaxCents =
    normalizedTaxEnabled && normalizedTaxRate > 0
      ? Math.round(taxableSubtotalCents * (normalizedTaxRate / 100))
      : 0;

  return {
    discountType: normalizedDiscountType,
    discountValue: normalizedDiscountType ? normalizedDiscountValue : 0,
    discountAmount: toMoney(documentDiscountCents),
    taxEnabled: normalizedTaxEnabled,
    taxRate: normalizedTaxEnabled ? normalizedTaxRate : 0,
    taxAmount: toMoney(documentTaxCents),
    subtotal: toMoney(subtotalCents),
    discountTotal: toMoney(itemDiscountCents + documentDiscountCents),
    taxTotal: toMoney(itemTaxCents + documentTaxCents),
    grandTotal: toMoney(taxableSubtotalCents + itemTaxCents + documentTaxCents)
  };
}

export { DISCOUNT_TYPES, calculateDocumentPricing, toCents, toMoney, toNumber };
