import { useCallback, useMemo, useState } from "react";
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
import {
  createRouteTemplate,
  listRouteTemplates
} from "../../services/routeTemplateApi.js";
import { useToast } from "../feedback/toastContext.js";
import {
  cleanOptional,
  cleanRequired,
  getApiErrorMessage
} from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import {
  WEEKDAY_OPTIONS,
  formatRecurrenceSummary,
  formatTemplateStatus,
  normalizeDays
} from "./routeTemplateUtils.js";

const blankForm = {
  name: "",
  vehicleLabel: "",
  isActive: true,
  recurrenceDays: [],
  notes: ""
};

function validateTemplateForm(form) {
  const errors = {};
  const cleanName = cleanRequired(form.name);
  if (!cleanName || cleanName.length < 2) {
    errors.name = "Enter a template name (at least 2 characters).";
  }
  if (!normalizeDays(form.recurrenceDays).length) {
    errors.recurrenceDays = "Select at least one weekday.";
  }
  return errors;
}

function toTemplatePayload(form) {
  return {
    name: cleanRequired(form.name),
    vehicleLabel: cleanOptional(form.vehicleLabel),
    isActive: form.isActive !== false,
    recurrenceType: "weekly",
    recurrenceDays: normalizeDays(form.recurrenceDays),
    notes: cleanOptional(form.notes)
  };
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
      <small>Pick the recurring weekdays for this template.</small>
      {error ? (
        <small className="field-error" role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}

function TemplateForm({ onCancel, onSave }) {
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
    const nextErrors = validateTemplateForm(form);
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(toTemplatePayload(form));
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        "Template could not be created."
      );
      setError(message);
      showToast({
        message,
        title: "Template create failed",
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
      submitLabel="Create template"
      title="Create route template"
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
          placeholder="e.g. Van A"
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

function RouteTemplatesListScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const query = useMemo(() => {
    const params = { page, pageSize };
    if (search) params.search = search;
    if (activeFilter === "active") params.isActive = true;
    if (activeFilter === "inactive") params.isActive = false;
    return params;
  }, [page, pageSize, search, activeFilter]);

  const loadTemplateList = useCallback(
    (params, options) => listRouteTemplates(params, options),
    []
  );

  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(
          requestError,
          "Route templates could not be loaded."
        ),
        title: "Templates unavailable",
        tone: "error"
      });
    },
    [showToast]
  );

  const { data, error, isLoading, reload } = useResourceDirectory(
    loadTemplateList,
    query,
    { onError: handleListError }
  );
  const items = useMemo(() => data?.items || [], [data]);
  const hasFilters = Boolean(search || activeFilter);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveTemplate(payload) {
    const response = await createRouteTemplate(payload);
    showToast({
      message: "Add default stops to finish setting it up.",
      title: "Template created",
      tone: "success"
    });
    setIsCreating(false);
    reload();
    const newId = response?.data?.id;
    if (newId) {
      navigate(`/route-templates/${newId}`);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button
            className="primary-button"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            New template
          </button>
        }
        description="Reusable recurring route plans. Generate a dated route from a template whenever you need to dispatch."
        eyebrow="Route templates"
        title="Route templates"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          aria-label="Search templates"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search template name"
          type="search"
          value={searchDraft}
        />
        <select
          aria-label="Filter by status"
          onChange={(event) => {
            setActiveFilter(event.target.value);
            setPage(1);
          }}
          value={activeFilter}
        >
          <option value="">All templates</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
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
              setActiveFilter("");
              setPage(1);
            }}
            type="button"
          >
            Reset
          </button>
        ) : null}
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? (
        <LoadingSkeleton label="Loading route templates" rows={5} />
      ) : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters
            ? "No templates match the current filters."
            : "No route templates yet. Create your first recurring plan."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
          <div className="resource-table">
            <div className="resource-table-head route-template-grid">
              <span>Template</span>
              <span>Recurrence</span>
              <span>Status</span>
              <span>Vehicle</span>
              <span>Stops</span>
              <span />
            </div>
            {items.map((template) => (
              <article
                className="resource-row route-template-grid"
                key={template.id}
              >
                <div>
                  <strong>{template.name}</strong>
                  <span>{template.notes ? template.notes : "No notes"}</span>
                </div>
                <span>{formatRecurrenceSummary(template)}</span>
                <StatusPill
                  kind="template"
                  status={template.isActive ? "active" : "inactive"}
                  label={formatTemplateStatus(template.isActive)}
                />
                <span>{template.vehicleLabel || "No vehicle"}</span>
                <span>{template.stopCount ?? 0}</span>
                <button
                  className="secondary-button compact"
                  onClick={() => navigate(`/route-templates/${template.id}`)}
                  type="button"
                >
                  Open
                </button>
              </article>
            ))}
          </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating ? (
        <TemplateForm
          onCancel={() => setIsCreating(false)}
          onSave={saveTemplate}
        />
      ) : null}
    </div>
  );
}

export default RouteTemplatesListScreen;
