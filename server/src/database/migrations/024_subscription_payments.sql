CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  payment_status TEXT NOT NULL DEFAULT 'received',
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscription_payments_plan_check CHECK (plan_code IN ('free', 'basic', 'pro')),
  CONSTRAINT subscription_payments_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'annual')),
  CONSTRAINT subscription_payments_amount_check CHECK (amount >= 0),
  CONSTRAINT subscription_payments_method_check CHECK (
    payment_method IN ('bank_transfer', 'cash', 'card_manual', 'easypaisa', 'jazzcash', 'other')
  ),
  CONSTRAINT subscription_payments_status_check CHECK (
    payment_status IN ('received', 'pending', 'failed', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_vendor_created
ON subscription_payments (vendor_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription
ON subscription_payments (subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_status
ON subscription_payments (payment_status, created_at DESC);
