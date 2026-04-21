import env from "../../config/env.js";

const SETTINGS_LOGO_PATH = "/api/v1/settings/logo";
const SETTINGS_LOGO_ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SETTINGS_LOGO_MAX_BYTES = Math.min(env.FILE_UPLOAD_MAX_BYTES, 2 * 1024 * 1024);

export { SETTINGS_LOGO_ALLOWED_MIME_TYPES, SETTINGS_LOGO_MAX_BYTES, SETTINGS_LOGO_PATH };
