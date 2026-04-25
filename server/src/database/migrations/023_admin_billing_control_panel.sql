CREATE TABLE IF NOT EXISTS subscription_plan_configs (
  plan_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  monthly_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  annual_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  annual_free_months INTEGER NOT NULL DEFAULT 3 CHECK (annual_free_months >= 0),
  max_customers INTEGER CHECK (max_customers IS NULL OR max_customers >= 0),
  max_invoices_per_month INTEGER CHECK (max_invoices_per_month IS NULL OR max_invoices_per_month >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_plan_configs_code_check CHECK (plan_code IN ('free', 'basic', 'pro'))
);

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
  ('free', 'Free', 0, 0, 3, 30, 50, TRUE),
  ('basic', 'Basic', 0, 0, 3, 500, NULL, TRUE),
  ('pro', 'Pro', 0, 0, 3, NULL, NULL, TRUE)
ON CONFLICT (plan_code) DO NOTHING;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS managed_by_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE subscriptions
SET billing_cycle = CASE
                      WHEN billing_cycle IN ('monthly', 'annual') THEN billing_cycle
                      WHEN billing_cycle = 'yearly' THEN 'annual'
                      ELSE 'monthly'
                    END,
    current_period_start = COALESCE(current_period_start, started_at, created_at),
    current_period_end = COALESCE(current_period_end, expires_at)
WHERE billing_cycle IS DISTINCT FROM 'monthly'
   OR current_period_start IS NULL
   OR current_period_end IS NULL;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'annual'));

CREATE INDEX IF NOT EXISTS idx_subscription_plan_configs_active
ON subscription_plan_configs (is_active, plan_code);

CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_cycle
ON subscriptions (billing_cycle);
