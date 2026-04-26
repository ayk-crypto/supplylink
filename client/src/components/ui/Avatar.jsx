function getInitials(value, fallback = "?") {
  if (typeof value !== "string") {
    return fallback;
  }
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return fallback;
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || fallback;
}

const AVATAR_PALETTE = [
  { bg: "#e2e8f0", fg: "#334155" },
  { bg: "#d1fae5", fg: "#047857" },
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#ede9fe", fg: "#5b21b6" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#cffafe", fg: "#0e7490" }
];

function hashIndex(value, modulo) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulo;
}

function Avatar({ name, seed, size = "md", title }) {
  const initials = getInitials(name);
  const tone = AVATAR_PALETTE[hashIndex(seed || name || "supplylink", AVATAR_PALETTE.length)];
  const style = {
    backgroundColor: tone.bg,
    color: tone.fg
  };
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-${size}`}
      style={style}
      title={title || name || undefined}
    >
      {initials}
    </span>
  );
}

export default Avatar;
