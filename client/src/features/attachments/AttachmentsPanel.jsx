import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteAttachment,
  downloadAttachment,
  listAttachmentsForEntity,
  uploadAttachment
} from "../../services/attachmentApi.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionHeader
} from "../../components/ui/ResourceScreens.jsx";
import { useToast } from "../feedback/toastContext.js";
import { useAppSettings } from "../system/settingsContext.js";
import { confirmDestructive } from "../system/settingsFormat.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";

const SIZE_UNITS = ["B", "KB", "MB", "GB"];

function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  let unit = 0;
  let size = value;
  while (size >= 1024 && unit < SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const rounded = size >= 10 || unit === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${SIZE_UNITS[unit]}`;
}

function formatUploadedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function readItemsFromResponse(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function AttachmentsPanel({ entityType, entityId, title = "Attachments" }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState("");
  const [pendingDownloadId, setPendingDownloadId] = useState("");

  const reload = useCallback(
    async ({ signal } = {}) => {
      setIsLoading(true);
      setError("");
      try {
        const response = await listAttachmentsForEntity(entityType, entityId, { signal });
        setItems(readItemsFromResponse(response));
      } catch (requestError) {
        if (requestError.name === "AbortError") return;
        setError(getApiErrorMessage(requestError, "Attachments could not be loaded."));
      } finally {
        setIsLoading(false);
      }
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (!entityId) return undefined;
    const controller = new AbortController();
    reload({ signal: controller.signal });
    return () => controller.abort();
  }, [entityId, reload]);

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !entityId) return;

    setIsUploading(true);
    try {
      await uploadAttachment({ entityType, entityId, file });
      showToast({
        message: `${file.name} was uploaded.`,
        title: "Attachment uploaded",
        tone: "success"
      });
      await reload();
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Attachment upload failed."),
        title: "Upload failed",
        tone: "error"
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(item) {
    if (pendingDownloadId) return;
    setPendingDownloadId(item.id);
    try {
      await downloadAttachment(item.id, item.originalFilename);
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Attachment could not be downloaded."),
        title: "Download failed",
        tone: "error"
      });
    } finally {
      setPendingDownloadId("");
    }
  }

  async function handleDelete(item) {
    if (pendingDeleteId) return;
    if (!confirmDestructive(settings, `Delete "${item.originalFilename}"? This cannot be undone.`)) {
      return;
    }
    setPendingDeleteId(item.id);
    try {
      await deleteAttachment(item.id);
      showToast({
        message: `${item.originalFilename} was removed.`,
        title: "Attachment deleted",
        tone: "success"
      });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Attachment could not be deleted."),
        title: "Delete failed",
        tone: "error"
      });
    } finally {
      setPendingDeleteId("");
    }
  }

  function triggerFilePicker() {
    if (isUploading || !entityId) return;
    fileInputRef.current?.click();
  }

  if (!entityId) {
    return null;
  }

  return (
    <section className="transaction-panel attachments-panel">
      <SectionHeader
        title={title}
        hint={isLoading ? "Loading" : `${items.length} file${items.length === 1 ? "" : "s"}`}
        action={
          <>
            <input
              accept="*/*"
              hidden
              onChange={handleFileSelected}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="primary-button compact"
              disabled={isUploading}
              onClick={triggerFilePicker}
              type="button"
            >
              {isUploading ? "Uploading…" : "Upload file"}
            </button>
          </>
        }
      />

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingState>Loading attachments…</LoadingState> : null}
      {!isLoading && !items.length && !error ? (
        <EmptyState>No files uploaded yet.</EmptyState>
      ) : null}

      {items.length ? (
        <ul className="attachment-list">
          {items.map((item) => {
            const isDeleting = pendingDeleteId === item.id;
            const isDownloading = pendingDownloadId === item.id;
            return (
              <li className="attachment-row" key={item.id}>
                <div className="attachment-meta">
                  <strong title={item.originalFilename}>{item.originalFilename}</strong>
                  <span>
                    {formatFileSize(item.fileSize)}
                    {item.mimeType ? ` · ${item.mimeType}` : ""}
                    {item.createdAt ? ` · ${formatUploadedAt(item.createdAt)}` : ""}
                  </span>
                </div>
                <div className="attachment-actions">
                  <button
                    className="secondary-button compact"
                    disabled={isDownloading}
                    onClick={() => handleDownload(item)}
                    type="button"
                  >
                    {isDownloading ? "Opening…" : "Download"}
                  </button>
                  <button
                    className="secondary-button compact"
                    disabled={isDeleting}
                    onClick={() => handleDelete(item)}
                    type="button"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default AttachmentsPanel;
