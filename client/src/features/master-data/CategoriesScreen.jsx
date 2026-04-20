import { useCallback, useMemo, useState } from "react";
import {
  createCategory,
  listCategories,
  updateCategory
} from "../../services/masterDataApi.js";
import { useToast } from "../feedback/toastContext.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
import {
  EmptyState,
  Field,
  FormPanel,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import {
  cleanOptional,
  cleanRequired,
  getApiErrorMessage,
  isValidSlug
} from "./resourceUtils.js";
import { useResourceDirectory } from "./useResourceDirectory.js";

const blankForm = {
  description: "",
  name: "",
  slug: ""
};

function toCategoryForm(category) {
  if (!category) {
    return blankForm;
  }

  return {
    description: category.description || "",
    name: category.name || "",
    slug: category.slug || ""
  };
}

function toCategoryPayload(form) {
  return {
    description: cleanOptional(form.description),
    name: cleanRequired(form.name),
    slug: cleanOptional(form.slug) || undefined
  };
}

function validateCategoryForm(form) {
  const errors = {};
  const name = cleanRequired(form.name);
  const slug = cleanOptional(form.slug);

  if (!name || name.length < 2) {
    errors.name = "Enter a category name.";
  }

  if (slug && !isValidSlug(slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only.";
  }

  return errors;
}

function CategoryForm({ category, mode, onCancel, onSave }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(() => toCategoryForm(category));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field, value) {
    if (error) {
      setError("");
    }

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({
        ...current,
        [field]: ""
      }));
    }

    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const nextFieldErrors = validateCategoryForm(form);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      await onSave(toCategoryPayload(form));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Category could not be saved.");

      setError(message);
      showToast({
        message,
        title: mode === "edit" ? "Category update failed" : "Category create failed",
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
      submitLabel={mode === "edit" ? "Save category" : "Create category"}
      title={mode === "edit" ? "Edit category" : "Create category"}
    >
      <Field error={fieldErrors.name} label="Name">
        <input
          onChange={(event) => updateField("name", event.target.value)}
          required
          type="text"
          value={form.name}
        />
      </Field>
      <Field
        error={fieldErrors.slug}
        hint="Optional. Leave blank to generate from the name."
        label="Slug"
      >
        <input
          onChange={(event) => updateField("slug", event.target.value)}
          placeholder="Optional; generated from name"
          type="text"
          value={form.slug}
        />
      </Field>
      <Field label="Description">
        <textarea
          onChange={(event) => updateField("description", event.target.value)}
          rows="4"
          value={form.description}
        />
      </Field>
    </FormPanel>
  );
}

function CategoriesScreen() {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const query = useMemo(
    () => ({
      page,
      pageSize,
      search
    }),
    [page, pageSize, search]
  );
  const loadCategories = useCallback((params, options) => listCategories(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Categories could not be loaded."),
        title: "Categories unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadCategories, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(search);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveCategory(payload) {
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
      showToast({
        message: "Category changes were saved.",
        title: "Category updated"
      });
    } else {
      await createCategory(payload);
      showToast({
        message: "The category is available for products.",
        title: "Category created"
      });
    }

    setEditingCategory(null);
    setIsCreating(false);
    reload();
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            New category
          </button>
        }
        description="Organize the product catalog into simple vendor-scoped groups."
        eyebrow="Categories"
        title="Catalog categories"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name, slug, description"
          type="search"
          value={searchDraft}
        />
        <button className="secondary-button" type="submit">
          Search
        </button>
      </Toolbar>

      <ErrorState message={error} onRetry={reload} />
      {isLoading ? <LoadingState>Loading categories…</LoadingState> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No categories match the current search." : "No categories found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="resource-table">
          <div className="resource-table-head category-grid">
            <span>Name</span>
            <span>Slug</span>
            <span>Description</span>
            <span />
          </div>
          {items.map((category) => (
            <article className="resource-row category-grid" key={category.id}>
              <strong>{category.name}</strong>
              <span>{category.slug}</span>
              <span>{category.description || "No description"}</span>
              <button
                className="secondary-button compact"
                onClick={() => setEditingCategory(category)}
                type="button"
              >
                Edit
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating || editingCategory ? (
        <CategoryForm
          category={editingCategory}
          mode={editingCategory ? "edit" : "create"}
          onCancel={() => {
            setEditingCategory(null);
            setIsCreating(false);
          }}
          onSave={saveCategory}
        />
      ) : null}
    </div>
  );
}

export default CategoriesScreen;
