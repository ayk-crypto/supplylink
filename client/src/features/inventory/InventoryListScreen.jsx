import { useCallback, useMemo, useState } from "react";
import {
  EmptyState,
  PageHeader,
  Pagination,
  Toolbar
} from "../../components/ui/ResourceScreens.jsx";
import { listInventoryProducts } from "../../services/inventoryApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import StockAdjustForm from "./StockAdjustForm.jsx";
import { formatQuantity, stockLabel, stockTone } from "./inventoryUtils.js";

function InventoryListScreen({ navigate }) {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const query = useMemo(
    () => ({ page, pageSize: 10, search, status }),
    [page, search, status]
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
        description="Track on-hand quantities, flag low or negative stock, and apply manual adjustments."
        eyebrow="Inventory"
        title="Stock overview"
      />

      <Toolbar onSubmit={submitSearch}>
        <input
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search name or SKU"
          type="search"
          value={searchDraft}
        />
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

      {error ? <p className="surface-message error">{error}</p> : null}
      {isLoading ? <p className="surface-message loading">Loading inventory...</p> : null}
      {!isLoading && !items.length ? (
        <EmptyState>
          {hasFilters ? "No products match the current filters." : "No products found."}
        </EmptyState>
      ) : null}

      {items.length ? (
        <div className="resource-table">
          <div className="resource-table-head inventory-grid">
            <span>Product</span>
            <span>SKU</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Unit price</span>
            <span />
          </div>
          {items.map((product) => {
            const tone = stockTone(product.stockQuantity);
            return (
              <article className="resource-row inventory-grid" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.category?.name || "No category"}</span>
                </div>
                <span>{product.sku}</span>
                <div>
                  <strong className={`stock-amount stock-${tone}`}>
                    {formatQuantity(product.stockQuantity)}
                  </strong>
                  <span className={`stock-pill stock-${tone}`}>
                    {stockLabel(product.stockQuantity)}
                  </span>
                </div>
                <span className="status-pill">{product.status}</span>
                <span>{toMoney(product.unitPrice)}</span>
                <div className="inventory-row-actions">
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
