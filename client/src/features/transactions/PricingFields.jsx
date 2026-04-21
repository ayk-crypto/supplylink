import { Field } from "../../components/ui/ResourceScreens.jsx";

function PricingFields({ errors = {}, onChange, pricing }) {
  function update(field, value) {
    onChange({ ...pricing, [field]: value });
  }

  const discountActive = Boolean(pricing.discountType);

  return (
    <section className="transaction-panel">
      <div className="panel-heading">
        <h3>Pricing adjustments</h3>
        <span className="muted">Optional discount and tax for this document.</span>
      </div>
      <div className="form-grid">
        <Field hint="Choose a discount type to enable the value field." label="Discount Type">
          <select
            onChange={(event) => {
              const nextType = event.target.value;
              onChange({
                ...pricing,
                discountType: nextType,
                discountValue: nextType ? pricing.discountValue : "0"
              });
            }}
            value={pricing.discountType || ""}
          >
            <option value="">No discount</option>
            <option value="flat">Flat amount</option>
            <option value="percent">Percent (%)</option>
          </select>
        </Field>

        <Field
          error={errors.discountValue}
          hint={
            pricing.discountType === "percent"
              ? "Enter a percentage from 0 to 100."
              : pricing.discountType === "flat"
                ? "Enter the discount amount in your currency."
                : "Available once a discount type is selected."
          }
          label="Discount Value"
        >
          <input
            disabled={!discountActive}
            min="0"
            onChange={(event) => update("discountValue", event.target.value)}
            step="0.01"
            type="number"
            value={pricing.discountValue}
          />
        </Field>

        <Field hint="Enable to apply a single tax rate to this document." label="Tax Enabled">
          <label className="checkbox-row">
            <input
              checked={Boolean(pricing.taxEnabled)}
              onChange={(event) => {
                const enabled = event.target.checked;
                onChange({
                  ...pricing,
                  taxEnabled: enabled,
                  taxRate: enabled ? pricing.taxRate : "0"
                });
              }}
              type="checkbox"
            />
            <span>{pricing.taxEnabled ? "Tax applied" : "No tax"}</span>
          </label>
        </Field>

        <Field
          error={errors.taxRate}
          hint="Percent rate applied after discount."
          label="Tax Rate (%)"
        >
          <input
            disabled={!pricing.taxEnabled}
            max="100"
            min="0"
            onChange={(event) => update("taxRate", event.target.value)}
            step="0.01"
            type="number"
            value={pricing.taxRate}
          />
        </Field>
      </div>
    </section>
  );
}

export default PricingFields;
