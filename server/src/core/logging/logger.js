const SENSITIVE_KEY_PATTERN = /pass(word)?|token|secret|authorization|cookie|smtp|database_url/i;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function redactValue(key, value) {
  if (SENSITIVE_KEY_PATTERN.test(String(key))) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (isPlainObject(value)) {
    return sanitizeForLog(value);
  }

  return value;
}

function sanitizeForLog(input) {
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForLog(item));
  }

  if (!isPlainObject(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, redactValue(key, value)])
  );
}

function writeLog(level, event, payload = {}) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...sanitizeForLog(payload)
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  console.log(serialized);
}

const logger = {
  info: (event, payload) => writeLog("info", event, payload),
  warn: (event, payload) => writeLog("warn", event, payload),
  error: (event, payload) => writeLog("error", event, payload)
};

export { sanitizeForLog };
export default logger;
