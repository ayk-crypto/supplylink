import env from "../config/env.js";
import { getStoredToken, request } from "./httpClient.js";
import { toQueryString } from "./queryString.js";

async function listAttachmentsForEntity(entityType, entityId, options = {}) {
  return request(`/files/entity/${entityType}/${entityId}`, options);
}

async function listAttachments(params = {}, options = {}) {
  return request(`/files${toQueryString(params)}`, options);
}

async function uploadAttachment({ entityType, entityId, file, metadata }) {
  const body = new FormData();
  body.append("entityType", entityType);
  body.append("entityId", entityId);
  if (metadata && typeof metadata === "object") {
    body.append("metadata", JSON.stringify(metadata));
  }
  body.append("file", file);

  return request("/files", {
    method: "POST",
    body
  });
}

async function deleteAttachment(fileId) {
  return request(`/files/${fileId}`, {
    method: "DELETE"
  });
}

async function downloadAttachment(fileId, suggestedFilename) {
  const token = getStoredToken();
  const response = await fetch(`${env.apiBaseUrl}/files/${fileId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(
      payload?.message || `Download failed with status ${response.status}`
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : suggestedFilename || "download";

  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(objectUrl);
}

export {
  deleteAttachment,
  downloadAttachment,
  listAttachments,
  listAttachmentsForEntity,
  uploadAttachment
};
