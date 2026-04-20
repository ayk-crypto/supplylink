import { useCallback, useEffect, useMemo, useState } from "react";
import { listCustomers } from "../../services/masterDataApi.js";
import {
  createRouteStop,
  getRoute,
  updateRoute,
  updateRouteStop
} from "../../services/routeApi.js";
import {
  EmptyState,
  ErrorState,
  Field,
  FormPanel,
  LoadingSkeleton,
  PageHeader,
  SectionHeader,
  TableScroll
} from "../../components/ui/ResourceScreens.jsx";
import AttachmentsPanel from "../attachments/AttachmentsPanel.jsx";
import { useToast } from "../feedback/toastContext.js";
import { cleanOptional, getApiErrorMessage } from "../master-data/resourceUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { confirmDestructive } from "../system/settingsFormat.js";
import {
  ROUTE_STATUSES,
  STOP_STATUSES,
  formatDateTime,
  formatRouteDate,
  formatRouteStatus,
  formatStopCustomer,
  formatStopStatus,
  nextSequenceNumber
} from "./routeUtils.js";

const ROUTE_TRANSITIONS = [
  { action: "planned", label: "Mark planned", from: ["draft"] },
  { action: "in_progress", label: "Start route", from: ["planned"] },
  { action: "completed", label: "Complete route", from: ["in_progress"] },
  { action: "cancelled", label: "Cancel route", from: ["draft", "planned", "in_progress"], destructive: true }
];

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function StopForm({ defaultSequence, customers, onCancel, onSave, stop }) {
  const isEdit = Boolean(stop);
  const { showToast } = useToast();
  const [form, setForm] = useState(() => ({
    customerId: stop?.customer?.id || stop?.customerId || "",
    sequenceNumber: stop?.sequenceNumber || defaultSequence || 1,
    status: stop?.status || "pending",
    plannedArrivalAt: stop?.plannedArrivalAt
      ? stop.plannedArrivalAt.slice(0, 16)
      : "",
    notes: stop?.notes || ""
  }));
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

  function buildPayload() {
    const sequence = Number(form.sequenceNumber);
    const payload = {
      sequenceNumber: Number.isFinite(sequence) && sequence > 0 ? sequence : 1,
      status: form.status || "pending",
      notes: cleanOptional(form.notes)
    };
    if (form.plannedArrivalAt) {
      payload.plannedArrivalAt = new Date(form.plannedArrivalAt).toISOString();
    }
    if (!isEdit) {
      payload.customerId = form.customerId;
    }
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = {};
    if (!isEdit && !form.customerId) {
      errors.customerId = "Choose a customer for this stop.";
    }
    const sequence = Number(form.sequenceNumber);
    if (!Number.isFinite(sequence) || sequence < 1) {
      errors.sequenceNumber = "Sequence must be a positive number.";
    }
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(buildPayload());
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Stop could not be saved.");
      setError(message);
      showToast({
        message,
        title: isEdit ? "Stop update failed" : "Stop create failed",
        tone: "error"
      });
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
      submitLabel={isEdit ? "Save stop" : "Add stop"}
      title={isEdit ? `Edit stop #${stop?.sequenceNumber}` : "Add stop"}
    >
      {!isEdit ? (
        <Field error={fieldErrors.customerId} label="Customer">
          <select
            onChange={(event) => updateField("customerId", event.target.value)}
            required
            value={form.customerId}
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Customer">
          <input disabled type="text" value={formatStopCustomer(stop)} />
        </Field>
      )}
      <Field error={fieldErrors.sequenceNumber} hint="Lower numbers appear first." label="Sequence">
        <input
          min="1"
          onChange={(event) => updateField("sequenceNumber", event.target.value)}
          step="1"
          type="number"
          value={form.sequenceNumber}
        />
      </Field>
      <Field label="Status">
        <select
          onChange={(event) => updateField("status", event.target.value)}
          value={form.status}
        >
          {STOP_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {formatStopStatus(statusOption)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Planned arrival">
        <input
          onChange={(event) => updateField("plannedArrivalAt", event.target.value)}
          type="datetime-local"
          value={form.plannedArrivalAt}
        />
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

function RouteDetailScreen({ id, navigate }) {
  const { settings } = useAppSettings();
  const { showToast } = useToast();
  const [route, setRoute] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingStatus, setPendingStatus] = useState("");
  const [customers, setCustomers] = useState([]);
  const [stopFormState, setStopFormState] = useState(null);
  const [pendingStopId, setPendingStopId] = useState("");

  const loadRoute = useCallback(
    async ({ signal } = {}) => {
      const response = await getRoute(id, { signal });
      setRoute(response?.data || null);
    },
    [id]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        await loadRoute({ signal: controller.signal });
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") return;
        const message = getApiErrorMessage(requestError, "Route could not load.");
        setError(message);
        showToast({ message, title: "Route unavailable", tone: "error" });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadRoute, showToast]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function loadCustomerOptions() {
      try {
        const response = await listCustomers(
          { page: 1, pageSize: 100, status: "active" },
          { signal: controller.signal }
        );
        if (!active) return;
        setCustomers(
          (response.data.items || []).map((record) => ({
            id: record.customer.id,
            label: record.customer.companyName || record.customer.fullName
          }))
        );
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") return;
        // Silent: customer list is only needed for stop creation
      }
    }
    loadCustomerOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const sortedStops = useMemo(() => {
    const stops = Array.isArray(route?.stops) ? [...route.stops] : [];
    stops.sort((a, b) => (Number(a.sequenceNumber) || 0) - (Number(b.sequenceNumber) || 0));
    return stops;
  }, [route]);

  if (isLoading) {
    return <LoadingSkeleton label="Loading route" rows={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadRoute} />;
  }

  if (!route) {
    return <p className="surface-message">No route found.</p>;
  }

  async function transitionRouteStatus(spec) {
    if (pendingStatus) return;
    if (
      spec.destructive &&
      !confirmDestructive(settings, `${spec.label}? This cannot be undone.`)
    ) {
      return;
    }
    setPendingStatus(spec.action);
    try {
      const response = await updateRoute(route.id, { status: spec.action });
      const next = response?.data;
      if (next) {
        setRoute((current) => ({ ...current, ...next }));
      }
      showToast({
        message: `Route is now ${formatRouteStatus(spec.action).toLowerCase()}.`,
        title: "Route updated",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Route status could not change."),
        title: "Status change failed",
        tone: "error"
      });
    } finally {
      setPendingStatus("");
    }
  }

  async function transitionStopStatus(stop, nextStatus) {
    if (pendingStopId) return;
    setPendingStopId(stop.id);
    try {
      const response = await updateRouteStop(route.id, stop.id, { status: nextStatus });
      const updatedStop = response?.data;
      if (updatedStop) {
        setRoute((current) => ({
          ...current,
          stops: (current.stops || []).map((entry) =>
            entry.id === stop.id ? { ...entry, ...updatedStop } : entry
          )
        }));
      }
      showToast({
        message: `Stop #${stop.sequenceNumber} is now ${formatStopStatus(nextStatus).toLowerCase()}.`,
        title: "Stop updated",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(requestError, "Stop could not be updated."),
        title: "Stop update failed",
        tone: "error"
      });
    } finally {
      setPendingStopId("");
    }
  }

  async function saveStop(payload) {
    if (stopFormState?.mode === "edit") {
      const response = await updateRouteStop(route.id, stopFormState.stop.id, payload);
      const updatedStop = response?.data;
      setRoute((current) => ({
        ...current,
        stops: (current.stops || []).map((entry) =>
          entry.id === stopFormState.stop.id ? { ...entry, ...updatedStop } : entry
        )
      }));
      showToast({ message: "Stop changes were saved.", title: "Stop updated", tone: "success" });
    } else {
      const response = await createRouteStop(route.id, payload);
      const newStop = response?.data;
      if (newStop) {
        setRoute((current) => ({
          ...current,
          stops: [...(current.stops || []), newStop]
        }));
      } else {
        await loadRoute();
      }
      showToast({ message: "Stop added to the route.", title: "Stop added", tone: "success" });
    }
    setStopFormState(null);
  }

  const formattedStatus = formatRouteStatus(route.status);

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            {ROUTE_TRANSITIONS.map((spec) => {
              const enabled = spec.from.includes(route.status);
              const isBusy = pendingStatus === spec.action;
              return (
                <button
                  className={spec.destructive ? "secondary-button" : "primary-button"}
                  disabled={!enabled || Boolean(pendingStatus)}
                  key={spec.action}
                  onClick={() => transitionRouteStatus(spec)}
                  title={
                    enabled
                      ? `${spec.label} this route`
                      : `${spec.label} is not available while status is "${formattedStatus}".`
                  }
                  type="button"
                >
                  {isBusy ? `${spec.label}…` : spec.label}
                </button>
              );
            })}
            <button
              className="secondary-button"
              onClick={() => navigate("/routes")}
              type="button"
            >
              Back to routes
            </button>
          </div>
        }
        description={`Stops: ${sortedStops.length} · ${formattedStatus}`}
        eyebrow="Route"
        title={route.name}
      />

      <section className="detail-grid">
        <DetailField label="Status" value={formattedStatus} />
        <DetailField label="Date" value={formatRouteDate(route.routeDate)} />
        <DetailField label="Driver" value={route.driver?.fullName || "Unassigned"} />
        <DetailField label="Vehicle" value={route.vehicleLabel || "Not set"} />
        <DetailField label="Stops" value={String(sortedStops.length)} />
        <DetailField
          label="Last update"
          value={route.updatedAt ? formatDateTime(route.updatedAt) : ""}
        />
      </section>

      <section className="transaction-panel">
        <SectionHeader
          title="Stops"
          hint={`${sortedStops.length} stop${sortedStops.length === 1 ? "" : "s"}`}
          action={
            <button
              className="primary-button compact"
              disabled={!customers.length || route.status === "completed" || route.status === "cancelled"}
              onClick={() =>
                setStopFormState({
                  mode: "create",
                  defaultSequence: nextSequenceNumber(sortedStops)
                })
              }
              title={
                !customers.length
                  ? "Customer list is loading"
                  : route.status === "completed" || route.status === "cancelled"
                  ? "Cannot add stops to a completed or cancelled route"
                  : "Add a stop"
              }
              type="button"
            >
              Add stop
            </button>
          }
        />
        {sortedStops.length ? (
          <TableScroll>
            <div className="resource-table">
              <div className="resource-table-head route-stop-grid">
                <span>#</span>
                <span>Customer</span>
                <span>Status</span>
                <span>Planned arrival</span>
                <span>Order</span>
                <span />
              </div>
              {sortedStops.map((stop) => {
                const isBusy = pendingStopId === stop.id;
                return (
                  <article className="resource-row route-stop-grid" key={stop.id}>
                    <span className="stop-sequence">{stop.sequenceNumber}</span>
                    <div>
                      <strong>{formatStopCustomer(stop)}</strong>
                      <span>{stop.notes || "No notes"}</span>
                    </div>
                    <span className="status-pill">{formatStopStatus(stop.status)}</span>
                    <span>{formatDateTime(stop.plannedArrivalAt) || "—"}</span>
                    <span>{stop.order?.orderNumber || stop.orderId || "—"}</span>
                    <div className="stop-actions">
                      {stop.status !== "completed" ? (
                        <button
                          className="secondary-button compact"
                          disabled={isBusy}
                          onClick={() => transitionStopStatus(stop, "completed")}
                          type="button"
                        >
                          Complete
                        </button>
                      ) : null}
                      {stop.status === "pending" ? (
                        <button
                          className="secondary-button compact"
                          disabled={isBusy}
                          onClick={() => transitionStopStatus(stop, "skipped")}
                          type="button"
                        >
                          Skip
                        </button>
                      ) : null}
                      <button
                        className="secondary-button compact"
                        disabled={isBusy}
                        onClick={() => setStopFormState({ mode: "edit", stop })}
                        type="button"
                      >
                        Edit
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </TableScroll>
        ) : (
          <EmptyState>No stops yet. Add the first stop to begin planning.</EmptyState>
        )}
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Notes</h3>
        </div>
        <p className="muted">{route.notes || "No notes."}</p>
      </section>

      <AttachmentsPanel entityType="routes" entityId={route.id} />

      {stopFormState ? (
        <StopForm
          customers={customers}
          defaultSequence={stopFormState.defaultSequence}
          onCancel={() => setStopFormState(null)}
          onSave={saveStop}
          stop={stopFormState.stop}
        />
      ) : null}
    </div>
  );
}

export default RouteDetailScreen;
