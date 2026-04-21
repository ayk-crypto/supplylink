CREATE TABLE IF NOT EXISTS route_stop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_stop_id UUID NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route_stop_id, order_id),
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stop_orders_route_stop_id
ON route_stop_orders (route_stop_id);

INSERT INTO route_stop_orders (route_stop_id, order_id)
SELECT stop.id, stop.order_id
FROM route_stops stop
LEFT JOIN route_stop_orders assignment
  ON assignment.route_stop_id = stop.id
 AND assignment.order_id = stop.order_id
WHERE stop.order_id IS NOT NULL
  AND assignment.id IS NULL;

UPDATE route_stops
SET order_id = NULL,
    updated_at = NOW()
WHERE order_id IS NOT NULL;
