const DAY_MS = 1000 * 60 * 60 * 24;

export const ENGAGEMENT_THRESHOLDS = {
  AT_RISK_DAYS: 14,
  DORMANT_DAYS: 30
};

export const ENGAGEMENT_LABELS = {
  active: "Active",
  at_risk: "At Risk",
  dormant: "Dormant"
};

export const ENGAGEMENT_TONES = {
  active: "success",
  at_risk: "warning",
  dormant: "danger"
};

export const ENGAGEMENT_FILTER_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "active", label: "Active" },
  { value: "at_risk", label: "At Risk" },
  { value: "dormant", label: "Dormant" }
];

export function getLastActivityDate(vendor) {
  if (!vendor) return null;
  return (
    vendor.lastActivityAt ||
    vendor.last_activity_at ||
    vendor.lastActiveAt ||
    vendor.createdAt ||
    vendor.created_at ||
    null
  );
}

export function getDaysSince(value) {
  if (!value) return null;
  const date = new Date(value);
  const ms = date.valueOf();
  if (Number.isNaN(ms)) return null;
  return Math.floor((Date.now() - ms) / DAY_MS);
}

export function classifyEngagement(vendor) {
  const date = getLastActivityDate(vendor);
  const days = getDaysSince(date);
  if (days === null) return "active";
  if (days > ENGAGEMENT_THRESHOLDS.DORMANT_DAYS) return "dormant";
  if (days >= ENGAGEMENT_THRESHOLDS.AT_RISK_DAYS) return "at_risk";
  return "active";
}

export function formatLastActivity(value) {
  const days = getDaysSince(value);
  if (days === null) return "—";
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
