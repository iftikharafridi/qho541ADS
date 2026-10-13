-- Week 2 seminar, Activity 5: restocking through a movement log (model answer)
-- Run against shop_v1. Warehouse staff record deliveries in stock_movement;
-- triggers validate the delivery and update inventory automatically.
PRAGMA foreign_keys = ON;

CREATE TABLE stock_movement (
    movement_id INTEGER PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES product (product_id),
    qty_change  INTEGER NOT NULL,
    reason      TEXT    NOT NULL CHECK (reason IN ('restock', 'damaged')),
    moved_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- A delivery must add stock; a damaged-goods write-off must remove it
CREATE TRIGGER movement_check_sign
BEFORE INSERT ON stock_movement
FOR EACH ROW
WHEN (NEW.reason = 'restock' AND NEW.qty_change <= 0)
  OR (NEW.reason = 'damaged' AND NEW.qty_change >= 0)
BEGIN
    SELECT RAISE(ABORT, 'Restock must be positive and damaged stock negative');
END;

-- Stock can never go below zero (the CHECK on inventory would also stop it,
-- but this message is clearer for the user)
CREATE TRIGGER movement_check_available
BEFORE INSERT ON stock_movement
FOR EACH ROW
WHEN NEW.qty_change < 0
 AND -NEW.qty_change > (SELECT qty_in_stock FROM inventory WHERE product_id = NEW.product_id)
BEGIN
    SELECT RAISE(ABORT, 'Cannot write off more than is in stock');
END;

CREATE TRIGGER movement_apply
AFTER INSERT ON stock_movement
FOR EACH ROW
BEGIN
    UPDATE inventory
    SET qty_in_stock   = qty_in_stock + NEW.qty_change,
        last_restocked = CASE WHEN NEW.reason = 'restock' THEN date(NEW.moved_at) ELSE last_restocked END
    WHERE product_id = NEW.product_id;
END;
