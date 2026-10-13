-- =====================================================================
-- QHO541 Online Shop database: version 1 (Week 1: normalised to 3NF)
-- Target: SQLite 3.35 or later (ships with Python 3.10+)
--
-- Run in DB Browser for SQLite (Execute SQL tab) or with:
--     python build_shop_db.py
-- Foreign keys are OFF by default in SQLite. Turn them on for EVERY
-- connection with:  PRAGMA foreign_keys = ON;
-- =====================================================================
PRAGMA foreign_keys = ON;

-- Product types, e.g. Drinks, Bakery (was "product type" in the flat file)
CREATE TABLE category (
    category_id   INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL UNIQUE,
    vat_rate      REAL    NOT NULL DEFAULT 0
                  CHECK (vat_rate BETWEEN 0 AND 1),           -- 0.20 = 20% VAT
    description   TEXT
);

-- Companies that supply products (was "product mark" in the flat file)
CREATE TABLE supplier (
    supplier_id   INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL UNIQUE,
    email         TEXT    NOT NULL UNIQUE,
    phone         TEXT,
    city          TEXT
);

-- Each product belongs to exactly one category and one supplier
CREATE TABLE product (
    product_id    INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL,
    price         REAL    NOT NULL CHECK (price >= 0),          -- current list price in GBP
    category_id   INTEGER NOT NULL
                  REFERENCES category (category_id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
    supplier_id   INTEGER NOT NULL
                  REFERENCES supplier (supplier_id)
                  ON UPDATE CASCADE ON DELETE RESTRICT
);

-- One stock record per product (1:1). product_id is both PK and FK.
CREATE TABLE inventory (
    product_id     INTEGER PRIMARY KEY
                   REFERENCES product (product_id)
                   ON UPDATE CASCADE ON DELETE CASCADE,
    qty_in_stock   INTEGER NOT NULL DEFAULT 0  CHECK (qty_in_stock >= 0),
    reorder_level  INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    last_restocked TEXT                                           -- ISO date 'YYYY-MM-DD'
);

CREATE TABLE customer (
    customer_id   INTEGER PRIMARY KEY,
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    phone         TEXT,
    address_line  TEXT    NOT NULL,
    postcode      TEXT    NOT NULL,
    registered_on TEXT    NOT NULL DEFAULT (date('now'))
);

-- Optional online login for a customer (1:1, optional on the customer side).
-- UNIQUE on customer_id is what stops a customer having two accounts.
CREATE TABLE user_account (
    account_id    INTEGER PRIMARY KEY,
    customer_id   INTEGER NOT NULL UNIQUE
                  REFERENCES customer (customer_id)
                  ON UPDATE CASCADE ON DELETE CASCADE,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,                              -- never store plain passwords (Week 6)
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- "orders", not "order": ORDER is a reserved word in SQL
CREATE TABLE orders (
    order_id      INTEGER PRIMARY KEY,
    customer_id   INTEGER NOT NULL
                  REFERENCES customer (customer_id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
    order_date    TEXT    NOT NULL DEFAULT (date('now')),
    status        TEXT    NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'))
);

-- Junction (associative) table resolving the M:N between orders and product.
-- unit_price records the price actually charged, which can differ from
-- today's product.price, so it is NOT redundant.
CREATE TABLE order_item (
    order_id      INTEGER NOT NULL
                  REFERENCES orders (order_id)
                  ON UPDATE CASCADE ON DELETE CASCADE,
    product_id    INTEGER NOT NULL
                  REFERENCES product (product_id)
                  ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    unit_price    REAL    NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);
