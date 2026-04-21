CREATE UNIQUE INDEX IF NOT EXISTS uq_route_stops_order_id_unique
ON route_stops (order_id)
WHERE order_id IS NOT NULL;
