import path from "path";
import AppError from "../../core/errors/AppError.js";

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".ps1",
  ".psm1",
  ".sh",
  ".js",
  ".mjs",
  ".cjs",
  ".jar",
  ".php",
  ".py",
  ".rb",
  ".dll",
  ".scr"
]);

function hasAllowedSignature(mimeType, buffer) {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 4).toString("utf8") === "%PDF";
  }

  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  if (mimeType === "image/jpeg") {
    return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  }

  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (["text/plain", "text/csv", "application/json"].includes(mimeType)) {
    return true;
  }

  return true;
}

function assertSafeUpload(file, { codePrefix = "FILE" } = {}) {
  if (!file) {
    return;
  }

  const extension = path.extname(file.originalname || "").toLowerCase();

  if (extension && DANGEROUS_EXTENSIONS.has(extension)) {
    throw new AppError("Executable uploads are not allowed", {
      statusCode: 422,
      code: `${codePrefix}_EXECUTABLE_BLOCKED`,
      details: [
        {
          path: "file",
          message: `Files with ${extension} extensions are blocked for safety`
        }
      ]
    });
  }

  if (!hasAllowedSignature(file.mimetype, file.buffer)) {
    throw new AppError("Uploaded file content does not match the declared file type", {
      statusCode: 422,
      code: `${codePrefix}_SIGNATURE_MISMATCH`,
      details: [
        {
          path: "file",
          message: "The uploaded file content does not match its MIME type"
        }
      ]
    });
  }
}

export { assertSafeUpload };
