-- Week 2 seminar, Activities 2 and 3: stock-control triggers (model answer)
-- Run against shop_v1 (which has no triggers yet).
PRAGMA foreign_keys = ON;

-- Activity 2a: BEFORE INSERT. Refuse a sale if there is not enough stock.
-- Solution with a WHEN clause (preferred: the condition is visible in the header).
CREATE TRIGGER check_stock
BEFORE INSERT ON order_item
FOR EACH ROW
WHEN NEW.quantity > COALESCE((SELECT qty_in_stock FROM inventory WHERE product_id = NEW.product_id), 0)
BEGIN
    SELECT RAISE(ABORT, 'Not enough stock');
END;

-- Activity 2b: AFTER INSERT. Reduce stock by the quantity actually ordered (NEW).
CREATE TRIGGER reduce_stock
AFTER INSERT ON order_item
FOR EACH ROW
BEGIN
    UPDATE inventory SET qty_in_stock = qty_in_stock - NEW.quantity
    WHERE product_id = NEW.product_id;
END;

-- Activity 3a: AFTER UPDATE OF quantity. Adjust by the difference.
CREATE TRIGGER adjust_stock
AFTER UPDATE OF quantity ON order_item
FOR EACH ROW
WHEN NEW.quantity <> OLD.quantity
BEGIN
    UPDATE inventory SET qty_in_stock = qty_in_stock - (NEW.quantity - OLD.quantity)
    WHERE product_id = NEW.product_id;
END;

-- Activity 3b: AFTER DELETE. A returned or removed line goes back into stock.
-- Only OLD exists in a DELETE trigger.
CREATE TRIGGER return_stock
AFTER DELETE ON order_item
FOR EACH ROW
BEGIN
    UPDATE inventory SET qty_in_stock = qty_in_stock + OLD.quantity
    WHERE product_id = OLD.product_id;
END;
