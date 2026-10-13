-- =====================================================================
-- QHO541 Online Shop: sample data for version 1
-- Run AFTER schema_v1.sql. All people, companies, e-mail addresses and
-- phone numbers are fictional (example.com/.example domains and Ofcom
-- drama-reserved phone ranges).
-- Every table has at least 5 rows, matching the assessment brief's
-- minimum for the student's own project.
-- =====================================================================
PRAGMA foreign_keys = ON;

-- UK VAT: most food is zero-rated; soft drinks, water and juice are standard-rated (20%).
INSERT INTO category (category_id, name, vat_rate, description) VALUES
    (1, 'Drinks',        0.20, 'Soft drinks, water and juices'),
    (2, 'Bakery',        0.00, 'Bread and baked goods'),
    (3, 'Food Cupboard', 0.00, 'Long-life groceries'),
    (4, 'Dairy',         0.00, 'Milk, butter and cheese'),
    (5, 'Frozen',        0.00, 'Frozen meals and vegetables');

INSERT INTO supplier (supplier_id, name, email, phone, city) VALUES
    (1, 'Fizz & Co Drinks',  'orders@fizzco.example',       '020 7946 0101', 'London'),
    (2, 'Solent Bakery Ltd', 'sales@solentbakery.example',  '01632 960002', 'Southampton'),
    (3, 'Home Foods Ltd',    'trade@homefoods.example',     '0118 496 0003', 'Reading'),
    (4, 'Best Products Ltd', 'hello@bestproducts.example',  '0121 496 0004', 'Birmingham'),
    (5, 'Meadow Dairy',      'dairy@meadow.example',        '01632 960005',  'Oxford');

INSERT INTO product (product_id, name, price, category_id, supplier_id) VALUES
    ( 1, 'Cola 330ml can',          0.85, 1, 1),
    ( 2, 'Sparkling Water 500ml',   0.60, 1, 1),
    ( 3, 'Orange Juice 1L',         1.75, 1, 1),
    ( 4, 'White Bread 800g',        1.50, 2, 2),
    ( 5, 'Croissants 4 pack',       2.20, 2, 2),
    ( 6, 'Butter 250g',             1.99, 4, 5),
    ( 7, 'Cheddar 400g',            3.40, 4, 5),
    ( 8, 'Olive Oil 750ml',         5.50, 3, 3),
    ( 9, 'Basmati Rice 1kg',        2.10, 3, 3),
    (10, 'Margherita Pizza 500g',   5.20, 5, 4),
    (11, 'Garden Peas 900g',        1.30, 5, 4),
    (12, 'Strawberry Jam 340g',     1.85, 3, 3);

INSERT INTO inventory (product_id, qty_in_stock, reorder_level, last_restocked) VALUES
    ( 1, 240, 50, '2026-01-28'),
    ( 2, 180, 40, '2026-01-28'),
    ( 3,  35, 20, '2026-01-15'),
    ( 4,  60, 25, '2026-02-02'),
    ( 5,   8, 10, '2026-01-20'),   -- below reorder level
    ( 6,  44, 15, '2026-01-25'),
    ( 7,   4, 10, '2025-12-30'),   -- below reorder level
    ( 8,  22, 10, '2026-01-10'),
    ( 9,  70, 20, '2026-01-10'),
    (10,  15, 15, '2026-01-30'),   -- exactly at reorder level
    (11,  90, 20, '2026-01-30'),
    (12,  27, 10, '2026-01-10');

INSERT INTO customer (customer_id, first_name, last_name, email, phone, address_line, postcode, registered_on) VALUES
    (1, 'Jane',   'Morris', 'jane.morris@example.com',   '07700 900101', '28 High Road, Southampton',   'SO19 8JK', '2025-09-01'),
    (2, 'George', 'Harris', 'george.harris@example.com', '07700 900102', '15 Middle Road, Witney',      'OX29 0HM', '2025-09-03'),
    (3, 'Andy',   'Green',  'andy.green@example.com',    '07700 900103', '15 Middle Road, London',      'EC1A 1BB', '2025-09-20'),
    (4, 'Karen',  'Holt',   'karen.holt@example.com',    '07700 900104', '4 Quay Street, Portsmouth',   'PO1 2AB',  '2025-10-11'),
    (5, 'Roman',  'Morris', 'roman.morris@example.com',  '07700 900105', '9 Park Lane, Southampton',    'SO15 2UP', '2025-10-30'),
    (6, 'James',  'Smith',  'james.smith@example.com',   '07700 900106', '77 Bristol Road, Birmingham', 'B15 2TT',  '2025-11-05'),
    (7, 'Priya',  'Shah',   'priya.shah@example.com',    '07700 900107', '3 Oxford Street, Manchester', 'M1 4BT',   '2025-12-12'),
    (8, 'Tom',    'Okafor', 'tom.okafor@example.com',    '07700 900108', '21 Mill Lane, Oxford',        'OX1 3PU',  '2026-01-29');

-- Six of the eight customers have an online account (Roman and Tom do not).
-- Demo password for every account: Shop2026!  (hashed with PBKDF2-SHA256; see Week 6)
INSERT INTO user_account (account_id, customer_id, username, password_hash, created_at) VALUES
    (1, 1, 'jmorris', 'pbkdf2_sha256$200000$56b2fb349ce835b652544df18c4cb28a$861c38eb6d02e12732cddfd0cce45a68f615fcb92875bff6088e6366e2de8a45', '2025-09-01 10:15:00'),
    (2, 2, 'gharris', 'pbkdf2_sha256$200000$ae946e4ae7ed8039ce74262dc1cf525a$657d27b79240cb6d8946d679b88457bfe047083f1f61b64c53f3f8bac866eb7b', '2025-09-03 18:42:00'),
    (3, 3, 'agreen',  'pbkdf2_sha256$200000$51660d075b4bfa06a98a3c2a29c1f335$fe12635c1dd5e115ac6c1d506607e7cca6f6cc8ca048c412538ff6ea0f11a941', '2025-09-20 09:05:00'),
    (4, 4, 'kholt',   'pbkdf2_sha256$200000$5152e4395452b6bf982168e596836009$fafeb5d5f9edd91ffad67d9c4073795e788b42d1d10bfb5a2f907226c71efbc8', '2025-10-11 12:30:00'),
    (5, 6, 'jsmith',  'pbkdf2_sha256$200000$469518a3e9fe9494c10a3305de46a0ea$1fbf9d5240fdf684518f770f85499634a36d83d96569c4fb60abe5d1fe626b73', '2025-11-05 20:01:00'),
    (6, 7, 'pshah',   'pbkdf2_sha256$200000$81bdcf3a1ef2b263f9ac663a793a3d1c$16656cf471aaff2ad858bed57da1ae72cfb068729407a44ff7ea6f34c5b2f046', '2025-12-12 16:47:00');

-- Orders 1001-1004 are the four orders in the Week 1 flat-file example.
-- Customer 8 (Tom) has not ordered yet: optional participation.
INSERT INTO orders (order_id, customer_id, order_date, status) VALUES
    (1001, 1, '2025-09-25', 'Delivered'),
    (1002, 2, '2025-09-26', 'Delivered'),
    (1003, 3, '2025-10-10', 'Delivered'),
    (1004, 1, '2025-11-10', 'Delivered'),
    (1005, 4, '2025-11-21', 'Delivered'),
    (1006, 6, '2025-12-02', 'Delivered'),
    (1007, 5, '2025-12-15', 'Shipped'),
    (1008, 7, '2026-01-08', 'Paid'),
    (1009, 1, '2026-01-20', 'Pending'),
    (1010, 2, '2026-02-03', 'Cancelled');

-- Cola cost 0.80 in 2025 and 0.85 now: unit_price keeps the price charged.
INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES
    (1001,  1, 1, 0.80), (1001,  4, 2, 1.50),
    (1002,  2, 2, 0.60), (1002,  6, 5, 1.99),
    (1003,  8, 1, 5.50), (1003, 10, 3, 5.20),
    (1004,  1, 4, 0.80), (1004, 10, 1, 5.20),
    (1005,  5, 2, 2.20), (1005,  6, 1, 1.99), (1005, 12, 1, 1.85),
    (1006,  9, 2, 2.10), (1006,  8, 1, 5.50), (1006, 11, 2, 1.30),
    (1007,  7, 1, 3.40), (1007,  4, 1, 1.50), (1007,  3, 2, 1.75),
    (1008,  1, 6, 0.85), (1008, 10, 2, 5.20), (1008, 11, 1, 1.30),
    (1009,  5, 1, 2.20), (1009,  3, 1, 1.75),
    (1010,  7, 2, 3.40);
