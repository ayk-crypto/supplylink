function pad(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfWeek(reference) {
  const date = new Date(reference);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday-first week
  date.setDate(date.getDate() - diff);
  return date;
}

function startOfMonth(reference) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function startOfQuarter(reference) {
  const month = Math.floor(reference.getMonth() / 3) * 3;
  return new Date(reference.getFullYear(), month, 1);
}

function getPresetRange(key, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "today":
      return { dateFrom: toIsoDate(today), dateTo: toIsoDate(today) };
    case "this_week":
      return { dateFrom: toIsoDate(startOfWeek(today)), dateTo: toIsoDate(today) };
    case "this_month":
      return { dateFrom: toIsoDate(startOfMonth(today)), dateTo: toIsoDate(today) };
    case "this_quarter":
      return { dateFrom: toIsoDate(startOfQuarter(today)), dateTo: toIsoDate(today) };
    case "last_30_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case "all_time":
    default:
      return { dateFrom: "", dateTo: "" };
  }
}

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "last_30_days", label: "Last 30 days" },
  { key: "this_quarter", label: "This quarter" },
  { key: "all_time", label: "All time" }
];

function matchPreset(dateFrom, dateTo, now = new Date()) {
  for (const preset of DATE_PRESETS) {
    const range = getPresetRange(preset.key, now);
    if (range.dateFrom === (dateFrom || "") && range.dateTo === (dateTo || "")) {
      return preset.key;
    }
  }
  return "";
}

export { DATE_PRESETS, getPresetRange, matchPreset, toIsoDate };
