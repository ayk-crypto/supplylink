import { useCallback, useMemo, useState } from "react";
import { createRoute, listRoutes } from "../../services/routeApi.js";
import {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  TableScroll,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentBadge from "../attachments/AttachmentBadge.jsx";
import { useAttachmentCounts } from "../attachments/useAttachmentCounts.js";
import { useToast } from "../feedback/toastContext.js";
import { cleanOptional, cleanRequired, getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import {
  ROUTE_STATUSES,
  formatRouteDate,
  formatRouteStatus
} from "./routeUtils.js";

const blankForm = {
  name: "",
  routeDate: "",
  vehicleLabel: "",
  status: "draft",
  notes: ""
};

function validateRouteForm(form) {
  const errors = {};
  if (!cleanRequired(form.name) || cleanRequired(form.name).length < 2) {
    errors.name = "Enter a route name (at least 2 characters).";
  }
  return errors;
}

function toRoutePayload(form) {
  return {
    name: cleanRequired(form.name),
    routeDate: cleanOptional(form.routeDate),
    vehicleLabel: cleanOptional(form.vehicleLabel),
    status: form.status || "draft",
    notes: cleanOptional(form.notes)
  };
}

function RouteForm({ onCancel, onSave }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    if (error) setError("");
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: "" }));
    }
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRouteForm(form);
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(toRoutePayload(form));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Route could not be created.");
      setError(message);
      showToast({ message, title: "Route create failed", tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <FormPanel
      error={error}
      isSubmitting={isSaving}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      submitLabel="Create route"
      title="Create Route"
    >
      <Field error={fieldErrors.name} label="Route name">
        <input
          onChange={(event) => updateField("name", event.target.value)}
          required
          type="text"
          value={form.name}
        />
      </Field>
      <Field label="Route date">
        <input
          onChange={(event) => updateField("routeDate", event.target.value)}
          type="date"
          value={form.routeDate}
        />
      </Field>
      <Field label="Vehicle label">
        <input
          onChange={(event) => updateField("vehicleLabel", event.target.value)}
          placeholder="e.g. Van A"
          type="text"
          value={form.vehicleLabel}
        />
      </Field>
      <Field label="Status">
        <select
          onChange={(event) => updateField("status", event.target.value)}
          value={form.status}
        >
          {ROUTE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatRouteStatus(status)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          onChange={(event) => updateField("notes", event.target.value)}
          rows="3"
          value={form.notes}
        />
      </Field>
    </FormPanel>
  );
}

function RoutesListScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const query = useMemo(
    () => ({ page, pageSize, search, status }),
    [page, pageSize, search, status]
  );
  const loadRouteList = useCallback((params, options) => listRoutes(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Routes could not be loaded."),
        title: "Routes unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadRouteList, query, {
    onError: handleListError
  });
  const items = useMemo(() => data?.items || [], [data]);
  const itemIds = useMemo(() => items.map((route) => route.id), [items]);
  const attachmentCounts = useAttachmentCounts("routes", itemIds);
  const hasFilters = Boolean(search || status);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveRoute(payload) {
    const response = await createRoute(payload);
    showToast({
      message: "The route is ready for stops.",
      title: "Route created",
      tone: "success"
    });
    setIsCreating(false);
    reload();
    const newId = response?.data?.id;
    if (newId) {
      navigate(`/routes/${newId}`);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            New route
          </button>
        }
        description="Plan delivery routes, manage stops, and track fulfillment progress."
        eyebrow="Routes"
        title="Delivery Routes"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          aria-label="Search routes"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search route name"
          type="search"
          value={searchDraft}
        />
        <select
          aria-label="Filter by status"
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          {ROUTE_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {formatRouteStatus(statusOption)}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
        {hasFilters ? (
          <button
            className="secondary-button"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setStatus("");
              setPage(1);
            }}
            type="button"
          >
            Reset
          </button>
        ) : null}
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading routes" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No routes match the current filters." : "No routes found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head route-grid">
              <span>Route</span>
              <span>Date</span>
              <span>Status</span>
              <span>Vehicle</span>
              <span className="actions-col">Actions</span>
            </div>
            {items.map((route) => (
              <article className="resource-row route-grid" key={route.id}>
                <div>
                  <strong>
                    {route.name}
                    <AttachmentBadge
                      count={attachmentCounts[route.id]}
                      onClick={() => navigate(`/routes/${route.id}`)}
                    />
                  </strong>
                  <span>{route.driver?.fullName || "No driver assigned"}</span>
                </div>
                <span>{formatRouteDate(route.routeDate)}</span>
                <StatusPill kind="route" status={route.status} label={formatRouteStatus(route.status)} />
                <span>{route.vehicleLabel || "No vehicle"}</span>
                <button
                  className="secondary-button compact"
                  onClick={() => navigate(`/routes/${route.id}`)}
                  type="button"
                >
                  View
                </button>
              </article>
            ))}
          </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating ? (
        <RouteForm onCancel={() => setIsCreating(false)} onSave={saveRoute} />
      ) : null}
    </div>
  );
}

export default RoutesListScreen;
