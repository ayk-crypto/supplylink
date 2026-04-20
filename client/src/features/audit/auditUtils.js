const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All entity types" },
  { value: "product", label: "Product" },
  { value: "order", label: "Order" },
  { value: "invoice", label: "Invoice" },
  { value: "quotation", label: "Quotation" },
  { value: "payment", label: "Payment" }
];

const ENTITY_PATH_BUILDERS = {
  product: (id) => `/inventory/products/${id}`,
  inventory_product: (id) => `/inventory/products/${id}`,
  order: (id) => `/orders/${id}`,
  invoice: (id) => `/invoices/${id}`,
  quotation: (id) => `/quotations/${id}`,
  customer: (id) => `/ledger/customers/${id}`
};

function entityHrefFor(entityType, entityId) {
  if (!entityType || !entityId) {
    return null;
  }
  const builder = ENTITY_PATH_BUILDERS[entityType];
  return builder ? builder(entityId) : null;
}

function formatAuditDateTime(value) {
  if (!value) {
    return "—";
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return value;
  }
}

function shortId(value) {
  if (!value) {
    return null;
  }
  const text = String(value);
  return text.length > 10 ? `${text.slice(0, 8)}…` : text;
}

function formatMetadataSummary(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const entries = Object.entries(metadata).filter(([, value]) => {
    if (value === null || value === undefined || value === "") {
      return false;
    }
    if (typeof value === "object") {
      return Object.keys(value).length > 0;
    }
    return true;
  });
  if (!entries.length) {
    return null;
  }
  return entries
    .slice(0, 4)
    .map(([key, value]) => {
      const display =
        typeof value === "object" ? JSON.stringify(value) : String(value);
      const trimmed = display.length > 60 ? `${display.slice(0, 57)}…` : display;
      return `${key}: ${trimmed}`;
    })
    .join(" · ");
}

function eventLabelOf(event) {
  return event?.eventLabel || event?.eventType || "Event";
}

export {
  ENTITY_TYPE_OPTIONS,
  entityHrefFor,
  eventLabelOf,
  formatAuditDateTime,
  formatMetadataSummary,
  shortId
};
