import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination
} from "../../components/ui/ResourceScreens.jsx";
import {
  getInventoryProduct,
  listStockMovements
} from "../../services/inventoryApi.js";
import { useToast } from "../feedback/toastContext.js";
import { getApiErrorMessage, toMoney } from "../master-data/resourceUtils.js";
import { useResourceDirectory } from "../master-data/useResourceDirectory.js";
import { useAppSettings } from "../system/settingsContext.js";
import { formatDateTimeWith, getDefaultPageSize } from "../system/settingsFormat.js";
import StatusPill from "../../components/ui/StatusPill.jsx";
import StockAdjustForm from "./StockAdjustForm.jsx";
import {
  formatQuantity,
  movementToneFor,
  signedQuantity,
  stockLabel,
  stockTone
} from "./inventoryUtils.js";

function InventoryDetailScreen({ id, navigate }) {
  const { showToast } = useToast();
  const { settings } = useAppSettings();
  const pageSize = getDefaultPageSize(settings, 10);
  const [product, setProduct] = useState(null);
  const [productError, setProductError] = useState("");
  const [productLoading, setProductLoading] = useState(true);
  const [productReloadKey, setProductReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [movementType, setMovementType] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setProduct(null);

    async function load() {
      setProductLoading(true);
      setProductError("");

      try {
        const response = await getInventoryProduct(id, { signal: controller.signal });

        if (active) {
          setProduct(response.data);
        }
      } catch (requestError) {
        if (!active || requestError.name === "AbortError") {
          return;
        }

        const message = getApiErrorMessage(requestError, "Product could not be loaded.");
        setProductError(message);
        showToast({
          message,
          title: "Product unavailable",
          tone: "error"
        });
      } finally {
        if (active) {
          setProductLoading(false);
        }
      }
    }

    if (id) {
      load();
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, productReloadKey, showToast]);

  const movementQuery = useMemo(
    () => ({
      page,
      pageSize,
      productId: id,
      type: movementType || undefined
    }),
    [id, movementType, page, pageSize]
  );
  const loadMovements = useCallback(
    (params, options) => listStockMovements(params, options),
    []
  );
  const handleMovementError = useCallback(
    (requestError) => {
      showToast({
        message: getApiErrorMessage(requestError, "Stock movements could not be loaded."),
        title: "Movements unavailable",
        tone: "error"
      });
    },
    [showToast]
  );
  const movementsResult = useResourceDirectory(loadMovements, movementQuery, {
    onError: handleMovementError
  });
  const movements = movementsResult.data?.items || [];

  function reloadEverything() {
    setProductReloadKey((value) => value + 1);
    movementsResult.reload();
  }

  function goBack() {
    if (typeof navigate === "function") {
      navigate("/inventory");
    }
  }

  return (
    <div className="resource-page">
      <PageHeader
        action={
          <div className="button-row">
            <button className="secondary-button" onClick={goBack} type="button">
              Back to inventory
            </button>
            <button
              className="secondary-button"
              disabled={!product}
              onClick={() =>
                product && navigate && navigate(`/audit/product/${product.id}`)
              }
              type="button"
            >
              Audit history
            </button>
            <button
              className="primary-button"
              disabled={!product}
              onClick={() => setIsAdjusting(true)}
              type="button"
            >
              Adjust stock
            </button>
          </div>
        }
        description="Product summary, current stock on hand, and the full movement history."
        eyebrow="Inventory"
        title={product?.name || "Product inventory"}
      />

      <ErrorState message={productError} />
      {productLoading ? <LoadingState>Loading product…</LoadingState> : null}

      {product ? (
        <section className="panel-block">
          <header className="panel-heading">
            <div>
              <p className="eyebrow">Product summary</p>
              <h3>{product.name}</h3>
            </div>
            <StatusPill kind="product" status={product.status} />
          </header>

          <div className="detail-grid">
            <div className="detail-field">
              <span>SKU</span>
              <strong>{product.sku}</strong>
            </div>
            <div className="detail-field">
              <span>Category</span>
              <strong>{product.category?.name || "No category"}</strong>
            </div>
            <div className="detail-field">
              <span>Unit price</span>
              <strong>{toMoney(product.unitPrice)}</strong>
            </div>
            <div className="detail-field">
              <span>Stock on hand</span>
              <strong className={`stock-amount stock-${stockTone(product.stockQuantity)}`}>
                {formatQuantity(product.stockQuantity)}
              </strong>
              <small className={`stock-pill stock-${stockTone(product.stockQuantity)}`}>
                {stockLabel(product.stockQuantity)}
              </small>
            </div>
            {product.description ? (
              <div className="detail-field detail-field-wide">
                <span>Description</span>
                <strong>{product.description}</strong>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel-block">
        <header className="panel-heading">
          <div>
            <p className="eyebrow">Stock movements</p>
            <h3>Movement history</h3>
          </div>
          <select
            onChange={(event) => {
              setMovementType(event.target.value);
              setPage(1);
            }}
            value={movementType}
          >
            <option value="">All movement types</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </header>

        <ErrorState message={movementsResult.error} onRetry={movementsResult.reload} />
        {movementsResult.isLoading ? <LoadingState>Loading movements…</LoadingState> : null}
        {!movementsResult.isLoading && !movements.length ? (
          <EmptyState>No stock movements recorded yet.</EmptyState>
        ) : null}

        {movements.length ? (
          <div className="movement-list">
            {movements.map((movement) => {
              const tone = movementToneFor(movement.type);
              const signed = signedQuantity(movement);
              return (
                <article className="movement-card" key={movement.id}>
                  <header className="movement-card-head">
                    <span className={`movement-pill movement-${tone}`}>{movement.type}</span>
                    <strong className={`movement-quantity movement-${tone}`}>
                      {signed > 0 ? "+" : ""}
                      {formatQuantity(Math.abs(signed))}
                    </strong>
                    <time>{formatDateTimeWith(settings, movement.createdAt)}</time>
                  </header>
                  <dl className="movement-card-meta">
                    <div>
                      <dt>Reference</dt>
                      <dd>
                        <strong>{movement.referenceType || "—"}</strong>
                        {movement.referenceId ? <span>{movement.referenceId}</span> : null}
                      </dd>
                    </div>
                    <div>
                      <dt>Notes</dt>
                      <dd>{movement.notes || "—"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        ) : null}

        <Pagination pagination={movementsResult.data?.pagination} onPageChange={setPage} />
      </section>

      {isAdjusting && product ? (
        <StockAdjustForm
          onCancel={() => setIsAdjusting(false)}
          onSuccess={() => {
            setIsAdjusting(false);
            reloadEverything();
          }}
          product={product}
        />
      ) : null}
    </div>
  );
}

export default InventoryDetailScreen;
