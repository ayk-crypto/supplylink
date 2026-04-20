import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import env from "../../config/env.js";
import AppError from "../../core/errors/AppError.js";

function sanitizeFilename(filename = "attachment") {
  const parsed = path.parse(filename);
  const safeBase = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  const safeExt = parsed.ext
    .toLowerCase()
    .replace(/[^.\w]+/g, "")
    .slice(0, 20);

  return `${safeBase || "attachment"}${safeExt}`;
}

function getUploadRoot() {
  return path.resolve(env.FILE_UPLOAD_DIR);
}

function buildStorageKey(vendorId, storedFilename) {
  return path.posix.join("vendors", vendorId, storedFilename);
}

function resolveStoragePath(storageKey) {
  const uploadRoot = getUploadRoot();
  const storagePath = path.resolve(uploadRoot, storageKey);

  if (!storagePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new AppError("Invalid file storage key", {
      statusCode: 500,
      code: "INVALID_STORAGE_KEY"
    });
  }

  return storagePath;
}

async function saveLocalFile({ vendorId, originalFilename, buffer }) {
  const safeOriginalName = sanitizeFilename(originalFilename);
  const storedFilename = `${randomUUID()}-${safeOriginalName}`;
  const storageKey = buildStorageKey(vendorId, storedFilename);
  const storagePath = resolveStoragePath(storageKey);

  await fs.mkdir(path.dirname(storagePath), { recursive: true });
  await fs.writeFile(storagePath, buffer, { flag: "wx" });

  return {
    storageBackend: "local",
    storageKey,
    storedFilename
  };
}

async function deleteLocalFile(storageKey) {
  try {
    await fs.unlink(resolveStoragePath(storageKey));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

function getLocalFilePath(storageKey) {
  return resolveStoragePath(storageKey);
}

export { deleteLocalFile, getLocalFilePath, sanitizeFilename, saveLocalFile };
