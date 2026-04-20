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

function calculateTotals(items) {
  const subtotal = items.reduce((total, item) => total + calculateLineTotal(item), 0);

  return {
    discountTotal: 0,
    grandTotal: subtotal,
    subtotal,
    taxTotal: 0
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
  formatApiError,
  formatCustomer,
  getProductLabel,
  mapItemsForPayload,
  todayDate,
  toMoney,
  validateLineItems
};
