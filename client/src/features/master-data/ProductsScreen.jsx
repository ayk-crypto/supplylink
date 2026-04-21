import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProduct,
  listCategories,
  listProducts,
  updateProduct
} from "../../services/masterDataApi.js";
import { useToast } from "../feedback/toastContext.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";
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
import StatusPill from "../../components/ui/StatusPill.jsx";
import { cleanOptional, cleanRequired, getApiErrorMessage, toMoney } from "./resourceUtils.js";
import { useResourceDirectory } from "./useResourceDirectory.js";

const blankForm = {
  categoryId: "",
  description: "",
  name: "",
  sku: "",
  status: "active",
  unitPrice: "0"
};

function toProductForm(product) {
  if (!product) {
    return blankForm;
  }

  return {
    categoryId: product.categoryId || "",
    description: product.description || "",
    name: product.name || "",
    sku: product.sku || "",
    status: product.status || "active",
    unitPrice: product.unitPrice || "0"
  };
}

function toProductPayload(form) {
  return {
    categoryId: cleanOptional(form.categoryId),
    description: cleanOptional(form.description),
    name: cleanRequired(form.name),
    sku: cleanRequired(form.sku),
    status: form.status,
    unitPrice: Number(form.unitPrice || 0)
  };
}

function validateProductForm(form) {
  const errors = {};
  const sku = cleanRequired(form.sku);
  const name = cleanRequired(form.name);
  const price = Number(form.unitPrice);

  if (!sku) {
    errors.sku = "Enter a SKU.";
  }

  if (!name || name.length < 2) {
    errors.name = "Enter a product name.";
  }

  if (form.unitPrice === "" || Number.isNaN(price) || price < 0) {
    errors.unitPrice = "Enter a price of 0 or more.";
  }

  return errors;
}

function ProductForm({ categories, mode, onCancel, onSave, product }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(() => toProductForm(product));
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

    const nextFieldErrors = validateProductForm(form);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      await onSave(toProductPayload(form));
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, "Product could not be saved.");

      setError(message);
      showToast({
        message,
        title: mode === "edit" ? "Product update failed" : "Product create failed",
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
      submitLabel={mode === "edit" ? "Save product" : "Create product"}
      title={mode === "edit" ? "Edit product" : "Create product"}
    >
      <Field error={fieldErrors.sku} label="SKU">
        <input
          onChange={(event) => updateField("sku", event.target.value)}
          required
          type="text"
          value={form.sku}
        />
      </Field>
      <Field error={fieldErrors.name} label="Name">
        <input
          onChange={(event) => updateField("name", event.target.value)}
          required
          type="text"
          value={form.name}
        />
      </Field>
      <Field hint="Optional for now; recommended for catalog organization." label="Category">
        <select
          onChange={(event) => updateField("categoryId", event.target.value)}
          value={form.categoryId}
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>
      <Field error={fieldErrors.unitPrice} label="Unit price">
        <input
          min="0"
          onChange={(event) => updateField("unitPrice", event.target.value)}
          step="0.01"
          type="number"
          value={form.unitPrice}
        />
      </Field>
      <Field label="Status">
        <select onChange={(event) => updateField("status", event.target.value)} value={form.status}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </Field>
      <Field label="Description">
        <textarea
          onChange={(event) => updateField("description", event.target.value)}
          rows="3"
          value={form.description}
        />
      </Field>
    </FormPanel>
  );
}

function ProductsScreen() {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const query = useMemo(
    () => ({
      categoryId,
      page,
      pageSize,
      search,
      status
    }),
    [categoryId, page, pageSize, search, status]
  );
  const loadProducts = useCallback((params, options) => listProducts(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Products could not be loaded."),
        title: "Products unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadProducts, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(search || status || categoryId);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadCategoryOptions() {
      try {
        const response = await listCategories(
          { page: 1, pageSize: 100 },
          { signal: controller.signal }
        );

        if (active) {
          setCategories(response.data.items || []);
          setCategoryError("");
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        setCategoryError(getApiErrorMessage(requestError, "Categories could not be loaded."));
        showToast({
          message: getApiErrorMessage(requestError, "Categories could not be loaded."),
          title: "Category filter unavailable",
          tone: "error"
        });
      }
    }

    loadCategoryOptions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [showToast]);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  async function saveProduct(payload) {
    if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
      showToast({
        message: "Product changes were saved.",
        title: "Product updated"
      });
    } else {
      await createProduct(payload);
      showToast({
        message: "The product is available in the catalog.",
        title: "Product created"
      });
    }

    setEditingProduct(null);
    setIsCreating(false);
    reload();
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <button className="primary-button" onClick={() => setIsCreating(true)} type="button">
            New product
          </button>
        }
        description="Your sellable catalog — names, SKUs, pricing, categories, and availability all in one place."
        eyebrow="Products"
        title="Product catalog"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name, SKU, category"
          type="search"
          value={searchDraft}
        />
        <select
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
          value={categoryId}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <button className="secondary-button" type="submit">
          Search
        </button>
      </Toolbar>

      <ErrorState message={categoryError} />
      <ErrorState message={error} onRetry={reload} />
      {isLoading && !items.length ? <LoadingSkeleton label="Loading products" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No products match the current filters." : "No products found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <TableScroll>
        <div className="resource-table">
          <div className="resource-table-head product-grid">
            <span>Product</span>
            <span>SKU</span>
            <span>Category</span>
            <span>Price</span>
            <span>Status</span>
            <span />
          </div>
          {items.map((product) => (
            <article className="resource-row product-grid" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.description || "No description"}</span>
              </div>
              <span>{product.sku}</span>
              <span>{product.category?.name || "No category"}</span>
              <span>{toMoney(product.unitPrice)}</span>
              <StatusPill kind="product" status={product.status} />
              <button
                className="secondary-button compact"
                onClick={() => setEditingProduct(product)}
                type="button"
              >
                Edit
              </button>
            </article>
          ))}
        </div>
        </TableScroll>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {isCreating || editingProduct ? (
        <ProductForm
          categories={categories}
          mode={editingProduct ? "edit" : "create"}
          onCancel={() => {
            setEditingProduct(null);
            setIsCreating(false);
          }}
          onSave={saveProduct}
          product={editingProduct}
        />
      ) : null}
    </div>
  );
}

export default ProductsScreen;
