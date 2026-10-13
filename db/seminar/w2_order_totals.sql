-- Week 2 seminar, Activity 4: keep an order total up to date (model answer)
-- Based on the original Week 2 "order_cost" task. Run against shop_v1.
-- NOTE: order_total stores a value that can be calculated from order_item,
-- so it is deliberate DENORMALISATION. Triggers keep it consistent; Week 3
-- shows the alternative (a view that calculates the total when asked).
PRAGMA foreign_keys = ON;

CREATE TABLE order_total (
    order_id  INTEGER PRIMARY KEY REFERENCES orders (order_id) ON DELETE CASCADE,
    total     REAL    NOT NULL DEFAULT 0
);

-- Initialise totals for the orders that already exist
INSERT INTO order_total (order_id, total)
SELECT o.order_id, ROUND(IFNULL(SUM(oi.quantity * oi.unit_price), 0), 2)
FROM orders o LEFT JOIN order_item oi ON oi.order_id = o.order_id
GROUP BY o.order_id;

-- Every new order starts with a zero total
CREATE TRIGGER total_new_order
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO order_total (order_id, total) VALUES (NEW.order_id, 0);
END;

-- Recalculating from order_item (rather than adding/subtracting) is
-- simpler and can never drift out of step.
CREATE TRIGGER total_after_insert
AFTER INSERT ON order_item
FOR EACH ROW
BEGIN
    UPDATE order_total
    SET total = (SELECT ROUND(IFNULL(SUM(quantity * unit_price), 0), 2) FROM order_item WHERE order_id = NEW.order_id)
    WHERE order_id = NEW.order_id;
END;

CREATE TRIGGER total_after_update
AFTER UPDATE OF quantity, unit_price ON order_item
FOR EACH ROW
BEGIN
    UPDATE order_total
    SET total = (SELECT ROUND(IFNULL(SUM(quantity * unit_price), 0), 2) FROM order_item WHERE order_id = NEW.order_id)
    WHERE order_id = NEW.order_id;
END;

CREATE TRIGGER total_after_delete
AFTER DELETE ON order_item
FOR EACH ROW
BEGIN
    UPDATE order_total
    SET total = (SELECT ROUND(IFNULL(SUM(quantity * unit_price), 0), 2) FROM order_item WHERE order_id = OLD.order_id)
    WHERE order_id = OLD.order_id;
END;
