const STATUS_CATALOG = {
  relationship: {
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" },
    blocked: { label: "Blocked", tone: "danger" }
  },
  product: {
    draft: { label: "Draft", tone: "neutral" },
    active: { label: "Active", tone: "success" },
    archived: { label: "Archived", tone: "neutral" }
  },
  order: {
    draft: { label: "Draft", tone: "neutral" },
    confirmed: { label: "Confirmed", tone: "info" },
    packed: { label: "Packed", tone: "info" },
    dispatched: { label: "Dispatched", tone: "accent" },
    delivered: { label: "Delivered", tone: "success" },
    cancelled: { label: "Cancelled", tone: "danger" }
  },
  quotation: {
    draft: { label: "Draft", tone: "neutral" },
    sent: { label: "Sent", tone: "info" },
    accepted: { label: "Accepted", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    expired: { label: "Expired", tone: "warning" }
  },
  invoice: {
    draft: { label: "Draft", tone: "neutral" },
    issued: { label: "Issued", tone: "info" },
    partially_paid: { label: "Partial", tone: "warning" },
    paid: { label: "Paid", tone: "success" },
    void: { label: "Void", tone: "neutral" },
    overdue: { label: "Overdue", tone: "danger" }
  },
  route: {
    draft: { label: "Draft", tone: "neutral" },
    planned: { label: "Planned", tone: "neutral" },
    in_progress: { label: "In progress", tone: "info" },
    completed: { label: "Completed", tone: "success" },
    cancelled: { label: "Cancelled", tone: "danger" }
  },
  stop: {
    pending: { label: "Pending", tone: "neutral" },
    in_progress: { label: "In progress", tone: "info" },
    completed: { label: "Completed", tone: "success" },
    skipped: { label: "Skipped", tone: "warning" },
    cancelled: { label: "Cancelled", tone: "danger" }
  },
  template: {
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" }
  },
  audit: {
    invoice: { label: "Invoice", tone: "info" },
    order: { label: "Order", tone: "info" },
    payment: { label: "Payment", tone: "success" },
    quotation: { label: "Quotation", tone: "neutral" },
    customer: { label: "Customer", tone: "neutral" },
    adjustment: { label: "Adjustment", tone: "warning" },
    opening_balance: { label: "Opening balance", tone: "accent" }
  }
};

function humanize(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const text = String(value).replace(/[_-]+/g, " ").trim();
  if (!text) {
    return "—";
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function resolve(kind, status, label) {
  const key = String(status ?? "").toLowerCase();
  const entry = (STATUS_CATALOG[kind] || {})[key];
  if (entry) {
    return { label: label || entry.label, tone: entry.tone };
  }
  return { label: label || humanize(status), tone: "neutral" };
}

function StatusPill({ kind, status, label, tone, title }) {
  const resolved = tone
    ? { label: label || humanize(status), tone }
    : resolve(kind, status, label);

  return (
    <span
      className={`status-pill tone-${resolved.tone}`}
      title={title || undefined}
    >
      {resolved.label}
    </span>
  );
}

export default StatusPill;
