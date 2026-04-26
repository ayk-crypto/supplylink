ALTER TABLE subscription_plan_configs
  DROP CONSTRAINT IF EXISTS subscription_plan_configs_code_check;

ALTER TABLE subscription_plan_configs
  ADD CONSTRAINT subscription_plan_configs_code_check
  CHECK (plan_code IN ('free', 'basic', 'pro', 'custom'));

INSERT INTO subscription_plan_configs (
  plan_code,
  display_name,
  monthly_price,
  annual_price,
  annual_free_months,
  max_customers,
  max_invoices_per_month,
  is_active
)
VALUES
  ('custom', 'Custom Plan', 0, 0, 0, NULL, NULL, TRUE)
ON CONFLICT (plan_code) DO NOTHING;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'basic', 'pro', 'custom'));

ALTER TABLE subscription_payments
  DROP CONSTRAINT IF EXISTS subscription_payments_plan_check;

ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_plan_check
  CHECK (plan_code IN ('free', 'basic', 'pro', 'custom'));
