import {
  calculateLineTotal,
  createBlankItem,
  getProductLabel,
  toMoney
} from "./transactionUtils.js";

function LineItemEditor({ errors = {}, items, onChange, products }) {
  function updateItem(index, field, value) {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const nextItem = {
        ...item,
        [field]: value
      };

      if (field === "productId") {
        const product = products.find((entry) => entry.id === value);

        if (product) {
          nextItem.unitPrice = String(product.unitPrice || 0);
          nextItem.description = nextItem.description || getProductLabel(product);
        }
      }

      return nextItem;
    });

    onChange(nextItems);
  }

  function removeItem(index) {
    onChange(items.filter((item, itemIndex) => itemIndex !== index));
  }

  return (
    <section className="line-editor">
      <div className="line-editor-heading">
        <div>
          <h3>Line items</h3>
          <p>Add products, quantities, and prices for this transaction.</p>
        </div>
        <button
          className="secondary-button"
          onClick={() => onChange([...items, createBlankItem()])}
          type="button"
        >
          Add item
        </button>
      </div>

      {errors._form ? <p className="field-error standalone">{errors._form}</p> : null}

      <div className="line-items">
        {items.map((item, index) => {
          const rowErrors = errors[index] || {};

          return (
            <article className="line-item-row" key={`${index}-${item.productId || "new"}`}>
              <label>
                <span>Product</span>
                <select
                  onChange={(event) => updateItem(index, "productId", event.target.value)}
                  value={item.productId}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {getProductLabel(product)}
                    </option>
                  ))}
                </select>
                {rowErrors.productId ? <small>{rowErrors.productId}</small> : null}
              </label>

              <label>
                <span>Quantity</span>
                <input
                  min="0.01"
                  onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  step="0.01"
                  type="number"
                  value={item.quantity}
                />
                {rowErrors.quantity ? <small>{rowErrors.quantity}</small> : null}
              </label>

              <label>
                <span>Unit price</span>
                <input
                  min="0"
                  onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                  step="0.01"
                  type="number"
                  value={item.unitPrice}
                />
                {rowErrors.unitPrice ? <small>{rowErrors.unitPrice}</small> : null}
              </label>

              <label>
                <span>Description</span>
                <input
                  onChange={(event) => updateItem(index, "description", event.target.value)}
                  type="text"
                  value={item.description}
                />
              </label>

              <div className="line-total">
                <span>Total</span>
                <strong>{toMoney(calculateLineTotal(item))}</strong>
              </div>

              <button
                className="secondary-button compact"
                disabled={items.length === 1}
                onClick={() => removeItem(index)}
                type="button"
              >
                Remove
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default LineItemEditor;
