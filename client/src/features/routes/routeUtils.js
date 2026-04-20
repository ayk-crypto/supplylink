const ROUTE_STATUSES = ["draft", "planned", "in_progress", "completed", "cancelled"];

const ROUTE_STATUS_LABELS = {
  draft: "Draft",
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

const STOP_STATUSES = ["pending", "completed", "skipped"];

const STOP_STATUS_LABELS = {
  pending: "Pending",
  completed: "Completed",
  skipped: "Skipped"
};

function formatRouteStatus(status) {
  return ROUTE_STATUS_LABELS[status] || status || "Draft";
}

function formatStopStatus(status) {
  return STOP_STATUS_LABELS[status] || status || "Pending";
}

function formatRouteDate(value) {
  if (!value) return "No date";
  return value;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatStopCustomer(stop) {
  if (!stop) return "Unknown customer";
  if (stop.customer) {
    return stop.customer.companyName || stop.customer.fullName || "Customer";
  }
  return "Customer";
}

function nextSequenceNumber(stops) {
  if (!Array.isArray(stops) || !stops.length) return 1;
  const max = stops.reduce((acc, stop) => {
    const value = Number(stop.sequenceNumber);
    return Number.isFinite(value) && value > acc ? value : acc;
  }, 0);
  return max + 1;
}

export {
  ROUTE_STATUSES,
  ROUTE_STATUS_LABELS,
  STOP_STATUSES,
  STOP_STATUS_LABELS,
  formatDateTime,
  formatRouteDate,
  formatRouteStatus,
  formatStopCustomer,
  formatStopStatus,
  nextSequenceNumber
};
