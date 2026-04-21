import { useCallback, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { listAuditEvents } from "../../services/auditApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateTimeWith, getDefaultPageSize } from "../system/settingsFormat.js";
import {
  ENTITY_TYPE_OPTIONS,
  actorDisplayLabel,
  entityDisplayLabel,
  entityHrefFor,
  eventLabelOf,
  formatMetadataSummary,
  shortId
} from "./auditUtils.js";

function AuditScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 20);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [eventTypeDraft, setEventTypeDraft] = useState("");
  const [eventType, setEventType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = useMemo(() => {
    const params = { page, pageSize };
    if (entityType) {
      params.entityType = entityType;
    }
    if (eventType) {
      params.eventType = eventType;
    }
    if (dateFrom) {
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      params.dateTo = dateTo;
    }
    return params;
  }, [page, pageSize, entityType, eventType, dateFrom, dateTo]);

  const loadEvents = useCallback(
    (params, options) => listAuditEvents(params, options),
    []
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

  const { data, error, isLoading, reload } = useResourceDirectory(loadEvents, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(entityType || eventType || dateFrom || dateTo);

  function submitFilters(event) {
    event.preventDefault();
    setEventType(eventTypeDraft.trim());
    setPage(1);
  }

  function clearFilters() {
    setEntityType("");
    setEventTypeDraft("");
    setEventType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="resource-page">
      <PageHeader
        description="Track changes across the workspace. Filter by entity, event, or date range to investigate activity."
        eyebrow="Audit"
        title="Activity History"
      />

      <Toolbar onSubmit={submitFilters}>
        <select
          aria-label="Entity type"
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
          value={entityType}
        >
          {ENTITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Event type"
          onChange={(event) => setEventTypeDraft(event.target.value)}
          placeholder="Event type (e.g. invoice.created)"
          type="search"
          value={eventTypeDraft}
        />
        <input
          aria-label="Date from"
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
          type="date"
          value={dateFrom}
        />
        <input
          aria-label="Date to"
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
          type="date"
          value={dateTo}
        />
        <button className="secondary-button" type="submit">
          Apply
        </button>
        {hasFilters ? (
          <button className="secondary-button" onClick={clearFilters} type="button">
            Clear
          </button>
        ) : null}
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading audit history" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters
            ? "No audit events match the current filters."
            : "No audit events recorded yet."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="audit-list">
          {items.map((event) => {
            const href = entityHrefFor(event.entityType, event.entityId);
            const metaSummary = formatMetadataSummary(event.metadata);
            const entityLabel = entityDisplayLabel(event);
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
                  <strong title={event.actorUserId || ""}>{actorLabel}</strong>
                  {entityLabel ? (
                    <>
                      {" "}on{" "}
                      <span className="audit-entity-type">{event.entityType || "record"}</span>{" "}
                      {href && navigate ? (
                        <button
                          className="link-button"
                          onClick={() => navigate(href)}
                          type="button"
                          title={event.entityId || undefined}
                        >
                          {entityLabel}
                        </button>
                      ) : (
                        <span title={event.entityId || undefined}>{entityLabel}</span>
                      )}
                    </>
                  ) : null}
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

export default AuditScreen;
