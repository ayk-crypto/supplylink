const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, label: "s" },
  { limit: 3600, divisor: 60, label: "m" },
  { limit: 86400, divisor: 3600, label: "h" },
  { limit: 604800, divisor: 86400, label: "d" },
  { limit: 2629800, divisor: 604800, label: "w" }
];

function formatRelativeTime(value) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));

  for (const unit of RELATIVE_UNITS) {
    if (seconds < unit.limit) {
      return `${Math.max(1, Math.floor(seconds / unit.divisor))}${unit.label} ago`;
    }
  }

  return new Date(value).toLocaleDateString();
}

function formatAbsoluteTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

const ENTITY_ROUTE_BUILDERS = {
  invoice: (id) => `/invoices/${id}`,
  invoices: (id) => `/invoices/${id}`,
  order: (id) => `/orders/${id}`,
  orders: (id) => `/orders/${id}`,
  quotation: (id) => `/quotations/${id}`,
  quotations: (id) => `/quotations/${id}`,
  customer: (id) => `/ledger/customers/${id}`,
  customers: (id) => `/ledger/customers/${id}`,
  customer_ledger: (id) => `/ledger/customers/${id}`,
  ledger: () => "/ledger",
  payment: () => "/ledger",
  payments: () => "/ledger",
  report: () => "/reports",
  reports: () => "/reports",
  dashboard: () => "/dashboard"
};

function buildNotificationRoute(notification) {
  if (!notification) {
    return null;
  }

  const { relatedEntityType, relatedEntityId } = notification;

  if (!relatedEntityType) {
    return null;
  }

  const builder = ENTITY_ROUTE_BUILDERS[relatedEntityType.toLowerCase()];

  if (!builder) {
    return null;
  }

  if (builder.length === 0) {
    return builder();
  }

  if (!relatedEntityId) {
    return null;
  }

  return builder(relatedEntityId);
}

function describeRelatedEntity(notification) {
  if (!notification?.relatedEntityType) {
    return "";
  }

  return notification.relatedEntityType.replace(/_/g, " ");
}

function relatedEntityLabel(notification) {
  if (!notification) {
    return "";
  }
  const related = notification.relatedEntity;
  if (related?.label) {
    return related.label;
  }
  if (related?.reference) {
    return related.reference;
  }
  return describeRelatedEntity(notification);
}

export {
  buildNotificationRoute,
  describeRelatedEntity,
  formatAbsoluteTime,
  formatRelativeTime,
  relatedEntityLabel
};
