ALTER TABLE routes
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE route_stops
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stop_type VARCHAR(30),
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_route_stops_order_id ON route_stops (order_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_customer_id ON route_stops (customer_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_vendor_customer_relationship_id
ON route_stops (vendor_customer_relationship_id);
