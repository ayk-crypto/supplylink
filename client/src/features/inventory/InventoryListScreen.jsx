import { useCallback, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { listInventoryProducts } from "../../services/inventoryApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import StockAdjustForm from "./StockAdjustForm.jsx";
import { formatQuantity, stockLabel, stockTone } from "./inventoryUtils.js";
import { useAppSettings } from "../system/settingsContext.js";
import { getDefaultPageSize } from "../system/settingsFormat.js";

function InventoryListScreen({ navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const query = useMemo(
    () => ({ page, pageSize, search, status }),
    [page, pageSize, search, status]
  );
  const loadProducts = useCallback((params, options) => listInventoryProducts(params, options), []);
  const handleListError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Inventory could not be loaded."),
        title: "Inventory unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const { data, error, isLoading, reload } = useResourceDirectory(loadProducts, query, {
    onError: handleListError
  });
  const items = data?.items || [];
  const hasFilters = Boolean(search || status);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function openProduct(product) {
    if (typeof navigate === "function") {
      navigate(`/inventory/products/${product.id}`);
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        description="See what's in stock at a glance — spot low or negative balances and make quick adjustments."
        eyebrow="Inventory"
        title="Stock overview"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          aria-label="Search products"
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name or SKU"
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
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
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
      {isLoading && !items.length ? <LoadingSkeleton label="Loading inventory" rows={5} /> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No products match the current filters." : "No products found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="inventory-list">
          {items.map((product) => {
            const tone = stockTone(product.stockQuantity);
            return (
              <article className="inventory-card" key={product.id}>
                <header className="inventory-card-head">
                  <div className="inventory-card-title">
                    <strong>{product.name}</strong>
                    <span>
                      {product.sku} · {product.category?.name || "No category"}
                    </span>
                  </div>
                  <StatusPill kind="product" status={product.status} />
                </header>
                <dl className="inventory-card-meta">
                  <div>
                    <dt>Stock</dt>
                    <dd>
                      <strong className={`stock-amount stock-${tone}`}>
                        {formatQuantity(product.stockQuantity)}
                      </strong>
                      <span className={`stock-pill stock-${tone}`}>
                        {stockLabel(product.stockQuantity)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Unit price</dt>
                    <dd>
                      <strong>{toMoney(product.unitPrice)}</strong>
                    </dd>
                  </div>
                </dl>
                <div className="inventory-card-actions">
                  <button
                    className="secondary-button compact"
                    onClick={() => openProduct(product)}
                    type="button"
                  >
                    View
                  </button>
                  <button
                    className="secondary-button compact"
                    onClick={() => setAdjustingProduct(product)}
                    type="button"
                  >
                    Adjust
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {adjustingProduct ? (
        <StockAdjustForm
          onCancel={() => setAdjustingProduct(null)}
          onSuccess={() => {
            setAdjustingProduct(null);
            reload();
          }}
          product={adjustingProduct}
        />
      ) : null}
    </div>
  );
}

export default InventoryListScreen;
