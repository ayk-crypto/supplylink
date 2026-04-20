CREATE TABLE IF NOT EXISTS route_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  notes TEXT,
  vehicle_label VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  recurrence_type VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (recurrence_type IN ('weekly')),
  recurrence_days SMALLINT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (cardinality(recurrence_days) > 0),
  CHECK (recurrence_days <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

CREATE TABLE IF NOT EXISTS route_template_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES route_templates(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, sequence_number)
);

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS source_route_template_id UUID REFERENCES route_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_route_templates_vendor_active
ON route_templates (vendor_id, is_active, name);

CREATE INDEX IF NOT EXISTS idx_route_templates_vendor_created
ON route_templates (vendor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_route_template_stops_template_sequence
ON route_template_stops (template_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_route_template_stops_customer
ON route_template_stops (customer_id);

CREATE INDEX IF NOT EXISTS idx_routes_source_route_template_id
ON routes (source_route_template_id);
