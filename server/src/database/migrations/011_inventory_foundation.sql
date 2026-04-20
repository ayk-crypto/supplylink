ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC(14, 3) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('inbound', 'outbound', 'adjustment')),
  quantity NUMERIC(14, 3) NOT NULL,
  reference_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  reference_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_vendor_created
ON stock_movements (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created
ON stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
ON stock_movements (vendor_id, reference_type, reference_id);
