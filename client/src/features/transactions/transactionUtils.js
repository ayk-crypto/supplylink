import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function createBlankItem() {
  return {
    description: "",
    productId: "",
    quantity: "1",
    unitPrice: "0"
  };
}

function createBlankPricing() {
  return {
    discountType: "",
    discountValue: "0",
    taxEnabled: false,
    taxRate: "0"
  };
}

function pricingFromRecord(record) {
  if (!record) {
    return createBlankPricing();
  }

  return {
    discountType: record.discountType || "",
    discountValue:
      record.discountValue !== undefined && record.discountValue !== null
        ? String(record.discountValue)
        : "0",
    taxEnabled: Boolean(record.taxEnabled),
    taxRate:
      record.taxRate !== undefined && record.taxRate !== null
        ? String(record.taxRate)
        : "0"
  };
}

function getProductLabel(product) {
  if (!product) {
    return "Unknown product";
  }

  return `${product.sku} - ${product.name}`;
}

function calculateLineTotal(item) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);

  if (Number.isNaN(quantity) || Number.isNaN(unitPrice)) {
    return 0;
  }

  return quantity * unitPrice;
}

function calculateTotals(items, pricing) {
  const subtotal = items.reduce((total, item) => total + calculateLineTotal(item), 0);

  const safePricing = pricing || createBlankPricing();
  const discountValue = Number(safePricing.discountValue || 0);
  let discountTotal = 0;

  if (safePricing.discountType === "percent" && discountValue > 0) {
    const cappedPercent = Math.min(Math.max(discountValue, 0), 100);
    discountTotal = (subtotal * cappedPercent) / 100;
  } else if (safePricing.discountType === "flat" && discountValue > 0) {
    discountTotal = Math.min(Math.max(discountValue, 0), subtotal);
  }

  const taxableSubtotal = Math.max(0, subtotal - discountTotal);
  const taxRate = Number(safePricing.taxRate || 0);
  const cappedTaxRate = Math.min(Math.max(taxRate, 0), 100);
  const taxTotal =
    safePricing.taxEnabled && cappedTaxRate > 0
      ? (taxableSubtotal * cappedTaxRate) / 100
      : 0;

  const grandTotal = taxableSubtotal + taxTotal;

  return {
    subtotal,
    discountTotal,
    taxableSubtotal,
    taxTotal,
    grandTotal
  };
}

function mapItemsForPayload(items) {
  return items.map((item) => ({
    description: item.description.trim() || undefined,
    productId: item.productId,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice || 0)
  }));
}

function mapPricingForPayload(pricing) {
  if (!pricing) {
    return {};
  }

  const payload = {};
  const discountValue = Number(pricing.discountValue || 0);

  if (pricing.discountType && discountValue > 0) {
    payload.discountType = pricing.discountType;
    payload.discountValue = discountValue;
  }

  if (pricing.taxEnabled) {
    payload.taxEnabled = true;
    payload.taxRate = Number(pricing.taxRate || 0);
  }

  return payload;
}

function validatePricing(pricing) {
  const errors = {};

  if (!pricing) {
    return errors;
  }

  const discountValue = Number(pricing.discountValue);

  if (pricing.discountType && (Number.isNaN(discountValue) || discountValue < 0)) {
    errors.discountValue = "Enter a discount of 0 or more.";
  }

  if (pricing.discountType === "percent" && discountValue > 100) {
    errors.discountValue = "Percent discount cannot exceed 100.";
  }

  if (pricing.taxEnabled) {
    const taxRate = Number(pricing.taxRate);
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.taxRate = "Enter a tax rate between 0 and 100.";
    }
  }

  return errors;
}

function validateLineItems(items) {
  const errors = {};

  if (!items.length) {
    errors._form = "Add at least one line item.";
    return errors;
  }

  items.forEach((item, index) => {
    const rowErrors = {};
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (!item.productId) {
      rowErrors.productId = "Select a product.";
    }

    if (!item.quantity || Number.isNaN(quantity) || quantity <= 0) {
      rowErrors.quantity = "Quantity must be greater than 0.";
    }

    if (item.unitPrice === "" || Number.isNaN(unitPrice) || unitPrice < 0) {
      rowErrors.unitPrice = "Price must be 0 or more.";
    }

    if (Object.keys(rowErrors).length > 0) {
      errors[index] = rowErrors;
    }
  });

  return errors;
}

function formatCustomer(customer) {
  if (!customer) {
    return "No customer";
  }

  return customer.companyName || customer.fullName || customer.label || "Unnamed customer";
}

function formatApiError(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

export {
  addDays,
  calculateLineTotal,
  calculateTotals,
  createBlankItem,
  createBlankPricing,
  formatApiError,
  formatCustomer,
  getProductLabel,
  mapItemsForPayload,
  mapPricingForPayload,
  pricingFromRecord,
  todayDate,
  toMoney,
  validateLineItems,
  validatePricing
};
