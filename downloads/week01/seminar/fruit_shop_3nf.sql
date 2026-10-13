-- Week 1 seminar, Task 2: Fruit shop flat file normalised to 3NF (model answer)
-- Source: "Normalization Forms (3).pptx" (Week 1 extra tasks).
-- Assumptions (state yours in your own work too):
--   * each row of the flat file is one sale made at one store;
--   * "Numbers of item left in stock" is ONE stock level per product shared by
--     both stores (Lime 18 -> 17 -> 16, Ice Cream 8 -> 3 after a Portsmouth sale),
--     so the current stock belongs in product, not in every sale row;
--   * product names are tidied to one spelling ("strawberry" = "Strawberry").
PRAGMA foreign_keys = ON;

CREATE TABLE customer (
    customer_id   INTEGER PRIMARY KEY,          -- surrogate: names are first names only
    customer_name TEXT NOT NULL,
    postcode      TEXT NOT NULL,
    phone         TEXT                          -- NOT unique: four customers share one number
);

CREATE TABLE store (
    store_id      INTEGER PRIMARY KEY,
    store_name    TEXT NOT NULL UNIQUE
);

CREATE TABLE product (
    product_id    INTEGER PRIMARY KEY,
    product_name  TEXT NOT NULL UNIQUE,
    qty_in_stock  INTEGER NOT NULL CHECK (qty_in_stock >= 0)
);

CREATE TABLE sale (
    sale_id       INTEGER PRIMARY KEY,
    customer_id   INTEGER NOT NULL REFERENCES customer (customer_id),
    store_id      INTEGER NOT NULL REFERENCES store (store_id)
);

CREATE TABLE sale_line (
    sale_id       INTEGER NOT NULL REFERENCES sale (sale_id) ON DELETE CASCADE,
    product_id    INTEGER NOT NULL REFERENCES product (product_id),
    qty_ordered   INTEGER NOT NULL CHECK (qty_ordered > 0),
    PRIMARY KEY (sale_id, product_id)
);

INSERT INTO customer VALUES
    (1, 'Jake',  'SO15 5UP', '0775252362'),
    (2, 'James', 'SO16 9OP', '0775523256'),
    (3, 'Roman', 'SO18 8IK', '0775252362'),
    (4, 'Andy',  'PO15 6YH', '0775252362'),
    (5, 'Karen', 'PO12 7YJ', '0775252362');

INSERT INTO store VALUES (1, 'Southampton'), (2, 'Portsmouth');

-- latest stock figure for each product in the flat file
INSERT INTO product VALUES
    (1, 'Pomegranate', 99), (2, 'Lime', 16), (3, 'Strawberry', 91),
    (4, 'Ice Cream', 3),    (5, 'Butter', 29), (6, 'Candy', 18), (7, 'Apple', 27);

INSERT INTO sale VALUES (1, 1, 1), (2, 2, 1), (3, 3, 1), (4, 4, 2), (5, 5, 2);

INSERT INTO sale_line VALUES
    (1, 1, 1), (1, 2, 2), (1, 3, 5),
    (2, 2, 1), (2, 4, 2), (2, 5, 1),
    (3, 6, 2), (3, 2, 1), (3, 3, 2),
    (4, 4, 5),
    (5, 3, 2), (5, 7, 3);
