const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
const WEEKDAY_OPTIONS = WEEKDAY_SHORT.map((label, index) => ({
  value: index,
  short: label,
  long: WEEKDAY_LONG[index]
}));

function normalizeDays(days) {
  if (!Array.isArray(days)) return [];
  const seen = new Set();
  const cleaned = [];
  days.forEach((value) => {
    const num = Number(value);
    if (Number.isFinite(num) && num >= 0 && num <= 6 && !seen.has(num)) {
      seen.add(num);
      cleaned.push(num);
    }
  });
  cleaned.sort((a, b) => a - b);
  return cleaned;
}

function formatRecurrenceDays(days) {
  const cleaned = normalizeDays(days);
  if (!cleaned.length) return "No days set";
  return cleaned.map((day) => WEEKDAY_SHORT[day]).join("/");
}

function formatRecurrenceSummary(template) {
  if (!template) return "No recurrence";
  const days = normalizeDays(template.recurrenceDays);
  if (!days.length) return "No recurrence";
  if (days.length === 1) {
    return `Weekly on ${WEEKDAY_LONG[days[0]]}`;
  }
  return `Weekly · ${days.map((day) => WEEKDAY_SHORT[day]).join("/")}`;
}

function formatTemplateStatus(isActive) {
  return isActive === false ? "Inactive" : "Active";
}

function nextStopSequence(stops) {
  if (!Array.isArray(stops) || !stops.length) return 1;
  const max = stops.reduce((acc, stop) => {
    const value = Number(stop.sequenceNumber);
    return Number.isFinite(value) && value > acc ? value : acc;
  }, 0);
  return max + 1;
}

function formatStopCustomer(stop) {
  if (!stop) return "Unknown customer";
  if (stop.customer) {
    return (
      stop.customer.companyName ||
      stop.customer.fullName ||
      stop.customer.label ||
      "Customer"
    );
  }
  return "Customer";
}

function todayIsoDate() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

export {
  WEEKDAY_OPTIONS,
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
  formatRecurrenceDays,
  formatRecurrenceSummary,
  formatStopCustomer,
  formatTemplateStatus,
  nextStopSequence,
  normalizeDays,
  todayIsoDate
};
