import { useCallback, useMemo, useState } from "react";
import {
  EmptyState,
  PageHeader,
  Pagination
} from "../../components/ui/ResourceScreens.jsx";
import { getEntityAuditHistory } from "../../services/auditApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateTimeWith, getDefaultPageSize } from "../system/settingsFormat.js";
import {
  actorDisplayLabel,
  entityDisplayLabel,
  entityHrefFor,
  eventLabelOf,
  formatMetadataSummary,
  shortId
} from "./auditUtils.js";

function EntityAuditScreen({ entityType, entityId, navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 20);
  const [page, setPage] = useState(1);

  const query = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const loadEvents = useCallback(
    (params, options) => getEntityAuditHistory(entityType, entityId, params, options),
    [entityType, entityId]
  );
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Audit history could not be loaded."),
        title: "Audit unavailable",
        tone: "error"
      });
    },
    [showToast]
  );

  const { data, error, isLoading } = useResourceDirectory(loadEvents, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const entityHref = entityHrefFor(entityType, entityId);
  const entityHeadline = entityDisplayLabel(items[0]) || shortId(entityId);

  return (
    <div className="resource-page">
      <PageHeader
        description={`History for ${entityType} ${entityHeadline}.`}
        eyebrow="Audit"
        title="Entity history"
        action={
          <div className="button-row">
            {entityHref && navigate ? (
              <button
                className="secondary-button"
                onClick={() => navigate(entityHref)}
                type="button"
              >
                Open record
              </button>
            ) : null}
            {navigate ? (
              <button
                className="secondary-button"
                onClick={() => navigate("/audit")}
                type="button"
              >
                All audit events
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading audit history...</p> : null}
      {!isLoading && !items.length ? (
        <EmptyState>No audit events recorded for this entity yet.</EmptyState>
      ) : null}

      {items.length ? (
        <div className="audit-list">
          {items.map((event) => {
            const metaSummary = formatMetadataSummary(event.metadata);
            const actorLabel = actorDisplayLabel(event);
            return (
              <article className="audit-card" key={event.id}>
                <header className="audit-card-head">
                  <div className="audit-card-title">
                    <strong>{eventLabelOf(event)}</strong>
                    {event.eventType && event.eventType !== eventLabelOf(event) ? (
                      <span className="audit-event-code">{event.eventType}</span>
                    ) : null}
                  </div>
                  <time dateTime={event.createdAt || undefined}>
                    {formatDateTimeWith(settings, event.createdAt)}
                  </time>
                </header>
                <p className="audit-summary">
                  by <strong title={event.actorUserId || ""}>{actorLabel}</strong>
                </p>
                {metaSummary ? (
                  <p className="audit-detail-line">{metaSummary}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  );
}

export default EntityAuditScreen;
