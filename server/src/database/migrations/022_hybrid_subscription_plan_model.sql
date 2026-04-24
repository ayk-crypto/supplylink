ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'active', 'expired', 'cancelled', 'trialing', 'past_due'));

WITH ranked_subscriptions AS (
  SELECT id,
         vendor_id,
         ROW_NUMBER() OVER (
           PARTITION BY vendor_id
           ORDER BY
             CASE status
               WHEN 'active' THEN 0
               WHEN 'trialing' THEN 1
               WHEN 'past_due' THEN 2
               WHEN 'expired' THEN 3
               WHEN 'cancelled' THEN 4
               ELSE 5
             END,
             COALESCE(current_period_end::timestamptz, trial_ends_at, created_at) DESC,
             created_at DESC,
             id DESC
         ) AS row_number
  FROM subscriptions
)
DELETE FROM subscriptions subscription
USING ranked_subscriptions ranked
WHERE subscription.id = ranked.id
  AND ranked.row_number > 1;

UPDATE subscriptions
SET plan = CASE
             WHEN LOWER(COALESCE(plan, plan_code, '')) IN ('free', 'basic', 'pro')
               THEN LOWER(COALESCE(plan, plan_code))
             ELSE 'free'
           END,
    status = CASE
               WHEN status = 'trialing' THEN 'trial'
               WHEN status = 'active' THEN 'active'
               WHEN status = 'cancelled' THEN 'cancelled'
               ELSE 'expired'
             END,
    started_at = COALESCE(started_at, current_period_start::timestamptz, created_at),
    expires_at = COALESCE(expires_at, current_period_end::timestamptz),
    trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '30 days'),
    updated_at = NOW();

ALTER TABLE subscriptions
  ALTER COLUMN vendor_id SET NOT NULL,
  ALTER COLUMN plan SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS plan_code,
  DROP COLUMN IF EXISTS billing_cycle,
  DROP COLUMN IF EXISTS current_period_start,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS metadata;

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'basic', 'pro'));

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('trial', 'active', 'expired', 'cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_vendor_unique
ON subscriptions (vendor_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON subscriptions (status);
