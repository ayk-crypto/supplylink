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

function hashHue(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

function Avatar({ name, seed, size = "md", title }) {
  const initials = getInitials(name);
  const hue = hashHue(seed || name || "supplylink");
  const style = {
    backgroundColor: `hsl(${hue} 60% 92%)`,
    color: `hsl(${hue} 50% 28%)`
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
