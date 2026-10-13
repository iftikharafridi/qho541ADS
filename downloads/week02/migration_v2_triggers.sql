-- =====================================================================
-- QHO541 Online Shop: version 2 (Week 2: triggers)
-- Apply AFTER schema_v1.sql and seed_v1.sql (build_shop_db_v2.py does this).
-- Adds four supporting tables, one view and 18 triggers that enforce the
-- shop's business rules inside the database.
-- =====================================================================
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. Supporting tables
-- ---------------------------------------------------------------------

-- Every change to stock, with the reason. order_id deliberately has NO
-- foreign key: history must survive even if an order is later deleted.
CREATE TABLE stock_movement (
    movement_id  INTEGER PRIMARY KEY,
    product_id   INTEGER NOT NULL
                 REFERENCES product (product_id) ON DELETE CASCADE,
    qty_change   INTEGER NOT NULL CHECK (qty_change <> 0),     -- negative = stock out
    reason       TEXT    NOT NULL
                 CHECK (reason IN ('sale', 'sale amended', 'sale removed', 'order cancelled', 'restock')),
    order_id     INTEGER,                                       -- for reference only
    moved_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Audit trail of price changes
CREATE TABLE price_history (
    history_id   INTEGER PRIMARY KEY,
    product_id   INTEGER NOT NULL
                 REFERENCES product (product_id) ON DELETE CASCADE,
    old_price    REAL    NOT NULL,
    new_price    REAL    NOT NULL,
    changed_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Raised automatically when stock falls to or below the reorder level
CREATE TABLE reorder_alert (
    alert_id      INTEGER PRIMARY KEY,
    product_id    INTEGER NOT NULL
                  REFERENCES product (product_id) ON DELETE CASCADE,
    qty_in_stock  INTEGER NOT NULL,
    reorder_level INTEGER NOT NULL,
    raised_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    resolved      INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0, 1))
);

-- General audit log. No foreign keys: it records rows that may be deleted.
CREATE TABLE audit_log (
    log_id       INTEGER PRIMARY KEY,
    table_name   TEXT NOT NULL,
    action       TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    row_key      TEXT NOT NULL,
    details      TEXT,
    logged_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- History before Week 2: Cola went from 0.80 to 0.85 on 1 January 2026
INSERT INTO price_history (product_id, old_price, new_price, changed_at)
VALUES (1, 0.80, 0.85, '2026-01-01 09:00:00');

-- ---------------------------------------------------------------------
-- 2. Order lines: stock control
-- ---------------------------------------------------------------------

-- BEFORE INSERT: refuse an order line if there is not enough stock.
-- COALESCE turns "no inventory row" (NULL) into 0, so it is refused too.
CREATE TRIGGER trg_order_item_check_stock
BEFORE INSERT ON order_item
FOR EACH ROW
WHEN NEW.quantity > COALESCE((SELECT qty_in_stock FROM inventory
                              WHERE product_id = NEW.product_id), 0)
BEGIN
    SELECT RAISE(ABORT, 'Not enough stock for this product');
END;

-- AFTER INSERT: take the items out of stock and record the movement.
CREATE TRIGGER trg_order_item_sale
AFTER INSERT ON order_item
FOR EACH ROW
BEGIN
    UPDATE inventory
    SET    qty_in_stock = qty_in_stock - NEW.quantity
    WHERE  product_id = NEW.product_id;

    INSERT INTO stock_movement (product_id, qty_change, reason, order_id)
    VALUES (NEW.product_id, -NEW.quantity, 'sale', NEW.order_id);
END;

-- BEFORE UPDATE: an increased quantity must also be in stock.
CREATE TRIGGER trg_order_item_check_amend
BEFORE UPDATE OF quantity ON order_item
FOR EACH ROW
WHEN NEW.quantity - OLD.quantity > COALESCE((SELECT qty_in_stock FROM inventory
                                             WHERE product_id = NEW.product_id), 0)
BEGIN
    SELECT RAISE(ABORT, 'Not enough stock to increase this order line');
END;

-- AFTER UPDATE: adjust stock by the difference between OLD and NEW.
CREATE TRIGGER trg_order_item_amend
AFTER UPDATE OF quantity ON order_item
FOR EACH ROW
WHEN NEW.quantity <> OLD.quantity
BEGIN
    UPDATE inventory
    SET    qty_in_stock = qty_in_stock - (NEW.quantity - OLD.quantity)
    WHERE  product_id = NEW.product_id;

    INSERT INTO stock_movement (product_id, qty_change, reason, order_id)
    VALUES (NEW.product_id, OLD.quantity - NEW.quantity, 'sale amended', NEW.order_id);
END;

-- AFTER DELETE: put the items back, unless the whole order was already
-- cancelled (cancellation has returned the stock already).
CREATE TRIGGER trg_order_item_removed
AFTER DELETE ON order_item
FOR EACH ROW
WHEN (SELECT status FROM orders WHERE order_id = OLD.order_id) IS NOT 'Cancelled'
BEGIN
    UPDATE inventory
    SET    qty_in_stock = qty_in_stock + OLD.quantity
    WHERE  product_id = OLD.product_id;

    INSERT INTO stock_movement (product_id, qty_change, reason, order_id)
    VALUES (OLD.product_id, OLD.quantity, 'sale removed', OLD.order_id);
END;

-- BEFORE UPDATE: an order line may not be moved to another order or product
-- (stock accounting would break). Delete it and add a new line instead.
CREATE TRIGGER trg_order_item_no_rekey
BEFORE UPDATE OF order_id, product_id ON order_item
FOR EACH ROW
WHEN NEW.order_id IS NOT OLD.order_id OR NEW.product_id IS NOT OLD.product_id
BEGIN
    SELECT RAISE(ABORT, 'Change the quantity, or delete the line and add a new one');
END;

-- ---------------------------------------------------------------------
-- 3. Order lines: an order that has shipped is locked
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_order_item_lock_insert
BEFORE INSERT ON order_item
FOR EACH ROW
WHEN (SELECT status FROM orders WHERE order_id = NEW.order_id) IN ('Shipped', 'Delivered', 'Cancelled')
BEGIN
    SELECT RAISE(ABORT, 'This order can no longer be changed');
END;

CREATE TRIGGER trg_order_item_lock_update
BEFORE UPDATE ON order_item
FOR EACH ROW
WHEN (SELECT status FROM orders WHERE order_id = OLD.order_id) IN ('Shipped', 'Delivered', 'Cancelled')
BEGIN
    SELECT RAISE(ABORT, 'This order can no longer be changed');
END;

CREATE TRIGGER trg_order_item_lock_delete
BEFORE DELETE ON order_item
FOR EACH ROW
WHEN (SELECT status FROM orders WHERE order_id = OLD.order_id) IN ('Shipped', 'Delivered', 'Cancelled')
BEGIN
    SELECT RAISE(ABORT, 'This order can no longer be changed');
END;

-- ---------------------------------------------------------------------
-- 4. Orders: status workflow
-- ---------------------------------------------------------------------

-- BEFORE UPDATE: only allow Pending -> Paid -> Shipped -> Delivered,
-- and cancellation while Pending or Paid.
CREATE TRIGGER trg_orders_status_rules
BEFORE UPDATE OF status ON orders
FOR EACH ROW
WHEN NOT (   NEW.status = OLD.status
          OR (OLD.status = 'Pending' AND NEW.status IN ('Paid', 'Cancelled'))
          OR (OLD.status = 'Paid'    AND NEW.status IN ('Shipped', 'Cancelled'))
          OR (OLD.status = 'Shipped' AND NEW.status = 'Delivered'))
BEGIN
    SELECT RAISE(ABORT, 'Invalid order status change');
END;

-- AFTER UPDATE: cancelling an order returns all its items to stock.
CREATE TRIGGER trg_orders_cancel_restock
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN NEW.status = 'Cancelled' AND OLD.status <> 'Cancelled'
BEGIN
    UPDATE inventory
    SET    qty_in_stock = qty_in_stock + (SELECT oi.quantity FROM order_item AS oi
                                          WHERE oi.order_id = NEW.order_id
                                            AND oi.product_id = inventory.product_id)
    WHERE  product_id IN (SELECT product_id FROM order_item WHERE order_id = NEW.order_id);

    INSERT INTO stock_movement (product_id, qty_change, reason, order_id)
    SELECT product_id, quantity, 'order cancelled', order_id
    FROM   order_item
    WHERE  order_id = NEW.order_id;
END;

-- BEFORE DELETE: only an abandoned (Pending) order may be deleted.
-- Anything else is a financial record: cancel it instead.
CREATE TRIGGER trg_orders_no_delete
BEFORE DELETE ON orders
FOR EACH ROW
WHEN OLD.status <> 'Pending'
BEGIN
    SELECT RAISE(ABORT, 'Only Pending orders can be deleted: cancel the order instead');
END;

-- ---------------------------------------------------------------------
-- 5. Inventory: reorder alerts (fired BY other triggers: cascading)
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_inventory_low_stock
AFTER UPDATE OF qty_in_stock ON inventory
FOR EACH ROW
WHEN NEW.qty_in_stock <= NEW.reorder_level
 AND OLD.qty_in_stock >  OLD.reorder_level          -- only when it CROSSES the level
BEGIN
    INSERT INTO reorder_alert (product_id, qty_in_stock, reorder_level)
    VALUES (NEW.product_id, NEW.qty_in_stock, NEW.reorder_level);
END;

CREATE TRIGGER trg_inventory_alert_resolved
AFTER UPDATE OF qty_in_stock ON inventory
FOR EACH ROW
WHEN NEW.qty_in_stock > NEW.reorder_level
BEGIN
    UPDATE reorder_alert SET resolved = 1
    WHERE  product_id = NEW.product_id AND resolved = 0;
END;

-- ---------------------------------------------------------------------
-- 6. Audit logging
-- ---------------------------------------------------------------------

-- UPDATE OF fires even if the value is unchanged, so WHEN checks it really changed.
CREATE TRIGGER trg_product_price_history
AFTER UPDATE OF price ON product
FOR EACH ROW
WHEN NEW.price <> OLD.price
BEGIN
    INSERT INTO price_history (product_id, old_price, new_price)
    VALUES (NEW.product_id, OLD.price, NEW.price);
END;

-- Record which personal details changed, with their old and new values.
-- IS NOT is the NULL-safe "not equal" (phone may be NULL).
CREATE TRIGGER trg_customer_audit_update
AFTER UPDATE OF email, phone, address_line, postcode ON customer
FOR EACH ROW
WHEN OLD.email IS NOT NEW.email OR OLD.phone IS NOT NEW.phone
  OR OLD.address_line IS NOT NEW.address_line OR OLD.postcode IS NOT NEW.postcode
BEGIN
    INSERT INTO audit_log (table_name, action, row_key, details)
    VALUES ('customer', 'UPDATE', 'customer_id=' || NEW.customer_id,
            CASE WHEN OLD.email IS NOT NEW.email
                 THEN 'email: ' || OLD.email || ' -> ' || NEW.email || '; ' ELSE '' END ||
            CASE WHEN OLD.phone IS NOT NEW.phone
                 THEN 'phone: ' || IFNULL(OLD.phone, 'NULL') || ' -> ' || IFNULL(NEW.phone, 'NULL') || '; ' ELSE '' END ||
            CASE WHEN OLD.address_line IS NOT NEW.address_line
                 THEN 'address: ' || OLD.address_line || ' -> ' || NEW.address_line || '; ' ELSE '' END ||
            CASE WHEN OLD.postcode IS NOT NEW.postcode
                 THEN 'postcode: ' || OLD.postcode || ' -> ' || NEW.postcode || '; ' ELSE '' END);
END;

CREATE TRIGGER trg_customer_audit_delete
AFTER DELETE ON customer
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (table_name, action, row_key, details)
    VALUES ('customer', 'DELETE', 'customer_id=' || OLD.customer_id,
            OLD.first_name || ' ' || OLD.last_name || ' <' || OLD.email || '>');
END;

-- ---------------------------------------------------------------------
-- 7. INSTEAD OF trigger on a view (views are covered fully in Week 3)
-- ---------------------------------------------------------------------

-- A friendlier view of order lines: product NAME instead of product_id
CREATE VIEW v_order_lines AS
SELECT oi.order_id, p.name AS product, oi.quantity, oi.unit_price
FROM   order_item AS oi
JOIN   product    AS p ON p.product_id = oi.product_id;

-- You cannot INSERT into a view directly. INSTEAD OF says what to do
-- instead: look up the product, fill in today's price, insert the real row.
-- (SQLite triggers cannot assign NEW.unit_price; this is the workaround.)
CREATE TRIGGER trg_v_order_lines_insert
INSTEAD OF INSERT ON v_order_lines
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'Unknown product name')
    WHERE NOT EXISTS (SELECT 1 FROM product WHERE name = NEW.product);

    INSERT INTO order_item (order_id, product_id, quantity, unit_price)
    SELECT NEW.order_id, product_id, NEW.quantity, price
    FROM   product
    WHERE  name = NEW.product;
END;
