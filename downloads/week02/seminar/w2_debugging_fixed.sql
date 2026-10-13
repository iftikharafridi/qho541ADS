-- Week 2 seminar, Activity 6: the three broken triggers, fixed (model answer)
-- Run against shop_v1.
PRAGMA foreign_keys = ON;

-- Bug 1 (from the original Week 2 slides): the stock was set to a fixed 99.
-- Fix: subtract the quantity from the new row, for the product in the new row.
CREATE TRIGGER fix1_reduce_stock
AFTER INSERT ON order_item
FOR EACH ROW
BEGIN
    UPDATE inventory SET qty_in_stock = qty_in_stock - NEW.quantity
    WHERE product_id = NEW.product_id;
END;

-- Bug 2: NEW used in a DELETE trigger ("no such column: NEW.quantity" at run time).
-- Fix: a deleted row only has OLD values.
CREATE TRIGGER fix2_return_stock
AFTER DELETE ON order_item
FOR EACH ROW
BEGIN
    UPDATE inventory SET qty_in_stock = qty_in_stock + OLD.quantity
    WHERE product_id = OLD.product_id;
END;

-- Bug 3: price "history" logged a row on every UPDATE of product, even when only
-- the name changed or the price was set to the same value.
-- Fix: UPDATE OF price, plus a WHEN clause that checks the value really changed.
CREATE TABLE price_log (product_id INTEGER, old_price REAL, new_price REAL,
                        changed_at TEXT DEFAULT (datetime('now')));
CREATE TRIGGER fix3_price_log
AFTER UPDATE OF price ON product
FOR EACH ROW
WHEN NEW.price <> OLD.price
BEGIN
    INSERT INTO price_log (product_id, old_price, new_price) VALUES (NEW.product_id, OLD.price, NEW.price);
END;
