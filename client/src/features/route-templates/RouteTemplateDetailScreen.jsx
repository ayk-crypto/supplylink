import { useCallback, useEffect, useMemo, useState } from "react";
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
import { listCustomers } from "../../services/masterDataApi.js";
import {
  createRouteTemplateStop,
  deleteRouteTemplate,
  deleteRouteTemplateStop,
  generateRouteFromTemplate,
  getRouteTemplate,
  updateRouteTemplate,
  updateRouteTemplateStop
} from "../../services/routeTemplateApi.js";
import { useToast } from "../feedback/toastContext.js";
import {
  cleanOptional,
  cleanRequired,
  getApiErrorMessage
} from "../master-data/resourceUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { confirmDestructive } from "../system/settingsFormat.js";
import {
  WEEKDAY_OPTIONS,
  formatRecurrenceSummary,
  formatStopCustomer,
  formatTemplateStatus,
  nextStopSequence,
  normalizeDays,
  todayIsoDate
} from "./routeTemplateUtils.js";

function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value || "Not set"}</strong>
    </div>
  );
}

function WeekdayPicker({ value, onChange, error }) {
  const selected = new Set(normalizeDays(value));
  function toggle(day) {
    const next = new Set(selected);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    onChange(Array.from(next).sort((a, b) => a - b));
  }
  return (
    <div className="form-field">
      <span>Weekdays</span>
      <div className="weekday-picker">
        {WEEKDAY_OPTIONS.map((option) => {
          const isOn = selected.has(option.value);
          return (
            <button
              aria-pressed={isOn}
              className={isOn ? "weekday-chip selected" : "weekday-chip"}
              key={option.value}
              onClick={() => toggle(option.value)}
              type="button"
            >
              {option.short}
            </button>
          );
        })}
      </div>
      {error ? (
        <small className="field-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}

function TemplateEditForm({ template, onCancel, onSave }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: template.name || "",
    vehicleLabel: template.vehicleLabel || "",
    isActive: template.isActive !== false,
    recurrenceDays: normalizeDays(template.recurrenceDays),
    notes: template.notes || ""
  });
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
    const errors = {};
    const cleanName = cleanRequired(form.name);
    if (!cleanName || cleanName.length < 2) {
      errors.name = "Enter a template name (at least 2 characters).";
    }
    if (!normalizeDays(form.recurrenceDays).length) {
      errors.recurrenceDays = "Select at least one weekday.";
    }
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        name: cleanRequired(form.name),
        vehicleLabel: cleanOptional(form.vehicleLabel),
        isActive: form.isActive,
        recurrenceType: "weekly",
        recurrenceDays: normalizeDays(form.recurrenceDays),
        notes: cleanOptional(form.notes)
      });
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        "Template could not be saved."
      );
      setError(message);
      showToast({ message, title: "Save failed", tone: "error" });
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
      submitLabel="Save template"
      title="Edit route template"
    >
      <Field error={fieldErrors.name} label="Template name">
        <input
          onChange={(event) => updateField("name", event.target.value)}
          required
          type="text"
          value={form.name}
        />
      </Field>
      <Field label="Vehicle label">
        <input
          onChange={(event) => updateField("vehicleLabel", event.target.value)}
          type="text"
          value={form.vehicleLabel}
        />
      </Field>
      <Field label="Status">
        <select
          onChange={(event) =>
            updateField("isActive", event.target.value === "active")
          }
          value={form.isActive ? "active" : "inactive"}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </Field>
      <Field label="Recurrence type">
        <input disabled type="text" value="Weekly" />
      </Field>
      <WeekdayPicker
        error={fieldErrors.recurrenceDays}
        onChange={(value) => updateField("recurrenceDays", value)}
        value={form.recurrenceDays}
      />
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

function StopForm({ defaultSequence, customers, stop, onCancel, onSave }) {
  const isEdit = Boolean(stop);
  const { showToast } = useToast();
  const [form, setForm] = useState(() => ({
    customerId: stop?.customer?.id || stop?.customerId || "",
    sequenceNumber: stop?.sequenceNumber || defaultSequence || 1,
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
    const payload = {
      sequenceNumber: sequence,
      notes: cleanOptional(form.notes)
    };
    if (!isEdit) {
      payload.customerId = form.customerId;
    }
    setIsSaving(true);
    try {
      await onSave(payload);
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        "Stop could not be saved."
      );
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
      title={isEdit ? `Edit stop #${stop?.sequenceNumber}` : "Add template stop"}
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
      <Field
        error={fieldErrors.sequenceNumber}
        hint="Lower numbers appear first. Sequence must be unique within the template."
        label="Sequence"
      >
        <input
          min="1"
          onChange={(event) => updateField("sequenceNumber", event.target.value)}
          step="1"
          type="number"
          value={form.sequenceNumber}
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

function GenerateRouteForm({ template, onCancel, onGenerated }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    routeDate: todayIsoDate(),
    name: "",
    vehicleLabel: template.vehicleLabel || "",
    notes: "",
    status: "draft"
  });
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
    const errors = {};
    if (!form.routeDate) {
      errors.routeDate = "Pick the date the new route will run.";
    }
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    const payload = {
      routeDate: form.routeDate,
      status: form.status || "draft"
    };
    const cleanName = cleanOptional(form.name);
    if (cleanName) payload.name = cleanName;
    const cleanVehicle = cleanOptional(form.vehicleLabel);
    if (cleanVehicle) payload.vehicleLabel = cleanVehicle;
    const cleanNotes = cleanOptional(form.notes);
    if (cleanNotes) payload.notes = cleanNotes;

    setIsSaving(true);
    try {
      await onGenerated(payload);
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        "Route could not be generated."
      );
      setError(message);
      showToast({
        message,
        title: "Generation failed",
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
      submitLabel={isSaving ? "Generating…" : "Generate route"}
      title="Generate route from template"
    >
      <Field
        error={fieldErrors.routeDate}
        hint="The new route will be dated to this day."
        label="Route date"
      >
        <input
          onChange={(event) => updateField("routeDate", event.target.value)}
          required
          type="date"
          value={form.routeDate}
        />
      </Field>
      <Field
        hint={`Defaults to "${template.name}" if left blank.`}
        label="Route name (optional)"
      >
        <input
          onChange={(event) => updateField("name", event.target.value)}
          placeholder={template.name}
          type="text"
          value={form.name}
        />
      </Field>
      <Field label="Vehicle label (optional)">
        <input
          onChange={(event) => updateField("vehicleLabel", event.target.value)}
          type="text"
          value={form.vehicleLabel}
        />
      </Field>
      <Field label="Initial status">
        <select
          onChange={(event) => updateField("status", event.target.value)}
          value={form.status}
        >
          <option value="draft">Draft</option>
          <option value="planned">Planned</option>
        </select>
      </Field>
      <Field label="Notes (optional)">
        <textarea
          onChange={(event) => updateField("notes", event.target.value)}
          rows="3"
          value={form.notes}
        />
      </Field>
    </FormPanel>
  );
}

function RouteTemplateDetailScreen({ id, navigate }) {
  const { settings } = useAppSettings();
  const { showToast } = useToast();
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stopFormState, setStopFormState] = useState(null);
  const [pendingStopId, setPendingStopId] = useState("");

  const loadTemplate = useCallback(
    async ({ signal } = {}) => {
      const response = await getRouteTemplate(id, { signal });
      setTemplate(response?.data || null);
    },
    [id]
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setTemplate(null);
    setStopFormState(null);
    setIsEditingTemplate(false);
    setIsGenerating(false);

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        await loadTemplate({ signal: controller.signal });
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") return;
        const message = getApiErrorMessage(
          requestError,
          "Template could not load."
        );
        setError(message);
        showToast({
          message,
          title: "Template unavailable",
          tone: "error"
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [loadTemplate, showToast]);

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
    const stops = Array.isArray(template?.stops) ? [...template.stops] : [];
    stops.sort(
      (a, b) => (Number(a.sequenceNumber) || 0) - (Number(b.sequenceNumber) || 0)
    );
    return stops;
  }, [template]);

  if (isLoading) {
    return <LoadingSkeleton label="Loading route template" rows={4} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadTemplate} />;
  }

  if (!template) {
    return <EmptyState>No route template found.</EmptyState>;
  }

  async function saveTemplate(payload) {
    const response = await updateRouteTemplate(template.id, payload);
    const next = response?.data;
    if (next) {
      setTemplate((current) => ({ ...current, ...next }));
    }
    showToast({
      message: "Template changes were saved.",
      title: "Template updated",
      tone: "success"
    });
    setIsEditingTemplate(false);
  }

  async function deleteTemplate() {
    if (
      !confirmDestructive(
        settings,
        "Delete this template? Already generated routes are not affected."
      )
    ) {
      return;
    }
    try {
      await deleteRouteTemplate(template.id);
      showToast({
        message: "Template removed.",
        title: "Template deleted",
        tone: "success"
      });
      navigate("/route-templates");
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Template could not be deleted."
        ),
        title: "Delete failed",
        tone: "error"
      });
    }
  }

  async function saveStop(payload) {
    if (stopFormState?.mode === "edit") {
      const response = await updateRouteTemplateStop(
        template.id,
        stopFormState.stop.id,
        payload
      );
      const updatedStop = response?.data;
      setTemplate((current) => ({
        ...current,
        stops: (current.stops || []).map((entry) =>
          entry.id === stopFormState.stop.id
            ? { ...entry, ...updatedStop }
            : entry
        )
      }));
      showToast({
        message: "Stop changes were saved.",
        title: "Stop updated",
        tone: "success"
      });
    } else {
      const response = await createRouteTemplateStop(template.id, payload);
      const newStop = response?.data;
      if (newStop) {
        setTemplate((current) => ({
          ...current,
          stops: [...(current.stops || []), newStop],
          stopCount: (current.stopCount || 0) + 1
        }));
      } else {
        await loadTemplate();
      }
      showToast({
        message: "Default stop added to the template.",
        title: "Stop added",
        tone: "success"
      });
    }
    setStopFormState(null);
  }

  async function removeStop(stop) {
    if (pendingStopId) return;
    if (
      !confirmDestructive(
        settings,
        `Remove stop #${stop.sequenceNumber} from this template?`
      )
    ) {
      return;
    }
    setPendingStopId(stop.id);
    try {
      await deleteRouteTemplateStop(template.id, stop.id);
      setTemplate((current) => ({
        ...current,
        stops: (current.stops || []).filter((entry) => entry.id !== stop.id),
        stopCount: Math.max(0, (current.stopCount || 0) - 1)
      }));
      showToast({
        message: `Stop #${stop.sequenceNumber} removed.`,
        title: "Stop removed",
        tone: "success"
      });
    } catch (requestError) {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Stop could not be removed."
        ),
        title: "Remove failed",
        tone: "error"
      });
    } finally {
      setPendingStopId("");
    }
  }

  async function generateRoute(payload) {
    const response = await generateRouteFromTemplate(template.id, payload);
    const generated = response?.data;
    showToast({
      message: `New route created for ${payload.routeDate}.`,
      title: "Route generated",
      tone: "success"
    });
    setIsGenerating(false);
    if (generated?.id) {
      navigate(`/routes/${generated.id}`);
    } else {
      navigate("/routes");
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button
              className="primary-button"
              disabled={!sortedStops.length || template.isActive === false}
              onClick={() => setIsGenerating(true)}
              title={
                !sortedStops.length
                  ? "Add at least one default stop before generating a route."
                  : template.isActive === false
                  ? "Activate the template to generate routes from it."
                  : "Generate a dated route from this template"
              }
              type="button"
            >
              Generate route
            </button>
            <button
              className="secondary-button"
              onClick={() => setIsEditingTemplate(true)}
              type="button"
            >
              Edit template
            </button>
            <button
              className="secondary-button"
              onClick={deleteTemplate}
              type="button"
            >
              Delete
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate("/route-templates")}
              type="button"
            >
              Back to templates
            </button>
          </div>
        }
        description={`${formatRecurrenceSummary(template)} · ${formatTemplateStatus(template.isActive)}`}
        eyebrow="Route template"
        title={template.name}
      />

      <section className="detail-grid">
        <DetailField
          label="Status"
          value={formatTemplateStatus(template.isActive)}
        />
        <DetailField label="Recurrence" value={formatRecurrenceSummary(template)} />
        <DetailField label="Vehicle" value={template.vehicleLabel || "Not set"} />
        <DetailField label="Default stops" value={String(sortedStops.length)} />
      </section>

      <section className="transaction-panel">
        <SectionHeader
          title="Default stops"
          hint={`${sortedStops.length} stop${sortedStops.length === 1 ? "" : "s"}`}
          action={
            <button
              className="primary-button compact"
              disabled={!customers.length}
              onClick={() =>
                setStopFormState({
                  mode: "create",
                  defaultSequence: nextStopSequence(sortedStops)
                })
              }
              title={
                !customers.length
                  ? "Customer list is loading"
                  : "Add a default stop"
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
              <div className="resource-table-head route-template-stop-grid">
                <span>#</span>
                <span>Customer</span>
                <span>Notes</span>
                <span />
              </div>
              {sortedStops.map((stop) => {
                const isBusy = pendingStopId === stop.id;
                return (
                  <article
                    className="resource-row route-template-stop-grid"
                    key={stop.id}
                  >
                    <span className="stop-sequence">{stop.sequenceNumber}</span>
                    <div>
                      <strong>{formatStopCustomer(stop)}</strong>
                      <span>
                        {stop.customer?.email || stop.customer?.phone || ""}
                      </span>
                    </div>
                    <span>{stop.notes || "No notes"}</span>
                    <div className="stop-actions">
                      <button
                        className="secondary-button compact"
                        disabled={isBusy}
                        onClick={() =>
                          setStopFormState({ mode: "edit", stop })
                        }
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="secondary-button compact"
                        disabled={isBusy}
                        onClick={() => removeStop(stop)}
                        type="button"
                      >
                        {isBusy ? "Removing…" : "Remove"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </TableScroll>
        ) : (
          <EmptyState>
            No default stops yet. Add the first stop to start using this
            template.
          </EmptyState>
        )}
      </section>

      <section className="transaction-panel">
        <div className="panel-heading">
          <h3>Notes</h3>
        </div>
        <p className="muted">{template.notes || "No notes."}</p>
      </section>

      {isEditingTemplate ? (
        <TemplateEditForm
          onCancel={() => setIsEditingTemplate(false)}
          onSave={saveTemplate}
          template={template}
        />
      ) : null}

      {isGenerating ? (
        <GenerateRouteForm
          onCancel={() => setIsGenerating(false)}
          onGenerated={generateRoute}
          template={template}
        />
      ) : null}

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

export default RouteTemplateDetailScreen;
