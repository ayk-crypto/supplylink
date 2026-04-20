CREATE TABLE IF NOT EXISTS vendor_settings (
  vendor_id UUID PRIMARY KEY REFERENCES vendors(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_settings_updated_at
ON vendor_settings (updated_at DESC);
