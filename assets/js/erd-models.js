/* =====================================================================
   ER models used on the site. One model = entities + relationships;
   each model has a "crow" and/or "chen" view that only holds layout.
   Relationship ends: aEnd/bEnd = [min, max] instances of THAT entity
   per ONE instance of the other entity.
   These models mirror db/schema_v1.sql exactly (checked by tests).
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};

  var E = {
    customer: { label: "CUSTOMER", desc: "a person who has registered with the shop", attrs: [
      ["customer_id", "PK", "INTEGER"], ["first_name", "", "TEXT"], ["last_name", "", "TEXT"], ["email", "UQ", "TEXT"],
      ["phone", "", "TEXT"], ["address_line", "", "TEXT"], ["postcode", "", "TEXT"], ["registered_on", "", "TEXT"]] },
    user_account: { label: "USER_ACCOUNT", desc: "online login details for a customer", attrs: [
      ["account_id", "PK", "INTEGER"], ["customer_id", "FK, UQ", "INTEGER"], ["username", "UQ", "TEXT"], ["password_hash", "", "TEXT"], ["created_at", "", "TEXT"]],
      note: "Optional for customers: phone and in-store customers do not need an online account." },
    orders: { label: "ORDERS", desc: "one checkout by one customer", attrs: [
      ["order_id", "PK", "INTEGER"], ["customer_id", "FK", "INTEGER"], ["order_date", "", "TEXT"], ["status", "", "TEXT"]],
      note: "Named ORDERS because ORDER is a reserved word in SQL (ORDER BY)." },
    order_item: { label: "ORDER_ITEM", desc: "one product line within an order (associative entity)", attrs: [
      ["order_id", "PK, FK", "INTEGER"], ["product_id", "PK, FK", "INTEGER"], ["quantity", "", "INTEGER"], ["unit_price", "", "REAL"]],
      note: "Associative (junction) entity that resolves the many-to-many relationship between ORDERS and PRODUCT. Its primary key is composite: (order_id, product_id)." },
    product: { label: "PRODUCT", desc: "an item the shop sells", attrs: [
      ["product_id", "PK", "INTEGER"], ["name", "", "TEXT"], ["price", "", "REAL"], ["category_id", "FK", "INTEGER"], ["supplier_id", "FK", "INTEGER"]] },
    category: { label: "CATEGORY", desc: "a product type such as Drinks or Bakery", attrs: [
      ["category_id", "PK", "INTEGER"], ["name", "UQ", "TEXT"], ["vat_rate", "", "REAL"], ["description", "", "TEXT"]] },
    supplier: { label: "SUPPLIER", desc: "a company that supplies products", attrs: [
      ["supplier_id", "PK", "INTEGER"], ["name", "UQ", "TEXT"], ["email", "UQ", "TEXT"], ["phone", "", "TEXT"], ["city", "", "TEXT"]] },
    inventory: { label: "INVENTORY", desc: "the stock record for one product", attrs: [
      ["product_id", "PK, FK", "INTEGER"], ["qty_in_stock", "", "INTEGER"], ["reorder_level", "", "INTEGER"], ["last_restocked", "", "TEXT"]],
      note: "Split from PRODUCT for design reasons (it changes on every sale and is maintained by warehouse staff), not because normalisation requires it." }
  };

  var R = {
    has_account: { identifying: false, a: "customer", b: "user_account", aEnd: [1, 1], bEnd: [0, 1], verb: "has", inv: "belongs to", chen: "HAS",
      impl: "<code>user_account.customer_id</code> NOT NULL UNIQUE REFERENCES <code>customer(customer_id)</code>. The UNIQUE constraint is what makes it one-to-one." },
    places: { identifying: false, a: "customer", b: "orders", aEnd: [1, 1], bEnd: [0, "N"], verb: "places", inv: "is placed by", chen: "PLACES",
      impl: "<code>orders.customer_id</code> NOT NULL REFERENCES <code>customer(customer_id)</code>." },
    contains: { a: "orders", b: "product", aEnd: [0, "N"], bEnd: [1, "N"], verb: "contains", inv: "appears in", chen: "CONTAINS",
      impl: "the junction table <code>order_item(order_id, product_id, quantity, unit_price)</code> with a composite primary key.",
      note: "In Chen notation the relationship itself owns the attributes <em>quantity</em> and <em>unit_price</em>; when mapped to tables they become columns of ORDER_ITEM." },
    order_lines: { identifying: true, a: "orders", b: "order_item", aEnd: [1, 1], bEnd: [1, "N"], verb: "contains", inv: "belongs to",
      impl: "<code>order_item.order_id</code> NOT NULL REFERENCES <code>orders(order_id)</code> (part of the composite primary key).",
      note: "The minimum of one item per order is a business rule. A foreign key cannot force an order to have items, so the application (or a trigger, Week 2) must check it." },
    product_lines: { identifying: true, a: "product", b: "order_item", aEnd: [1, 1], bEnd: [0, "N"], verb: "appears as", inv: "refers to",
      impl: "<code>order_item.product_id</code> NOT NULL REFERENCES <code>product(product_id)</code>." },
    classifies: { identifying: false, a: "category", b: "product", aEnd: [1, 1], bEnd: [0, "N"], verb: "classifies", inv: "belongs to", chen: "CLASSIFIES",
      impl: "<code>product.category_id</code> NOT NULL REFERENCES <code>category(category_id)</code>." },
    supplies: { identifying: false, a: "supplier", b: "product", aEnd: [1, 1], bEnd: [0, "N"], verb: "supplies", inv: "is supplied by", chen: "SUPPLIES",
      impl: "<code>product.supplier_id</code> NOT NULL REFERENCES <code>supplier(supplier_id)</code>." },
    stock: { a: "product", b: "inventory", aEnd: [1, 1], bEnd: [1, 1], verb: "has", inv: "records stock for", chen: "HAS_STOCK", identifying: true,
      impl: "<code>inventory.product_id</code> is both the PRIMARY KEY and a FOREIGN KEY to <code>product(product_id)</code>.",
      note: "The primary key guarantees <em>at most</em> one stock row per product; making sure every product <em>has</em> one is a business rule maintained by the application." }
  };

  function pick(ids) { var o = {}; ids.forEach(function (k) { o[k] = R[k]; }); return o; }
  function trim(id, keep) { var e = E[id]; return { label: e.label, desc: e.desc, note: e.note, attrs: e.attrs.filter(function (a) { return keep.indexOf(a[0]) >= 0; }) }; }

  var M = {};

  /* ---------------- Full Online Shop v1 ---------------- */
  M.shop = {
    title: "Online Shop database (v1)",
    entities: E,
    rels: R,
    views: {
      crow: {
        w: 1180, h: 640, minWidth: 800,
        note: "<strong>Crow’s Foot</strong> is a logical-level notation: it shows tables, keys and the junction table ORDER_ITEM. Click any entity or line for a plain-English reading.",
        pos: {
          user_account: { x: 20, y: 20 }, customer: { x: 20, y: 240 }, orders: { x: 330, y: 240 }, order_item: { x: 330, y: 500 },
          category: { x: 640, y: 20 }, product: { x: 640, y: 240 }, supplier: { x: 930, y: 20 }, inventory: { x: 640, y: 500 }
        },
        links: [
          { rel: "has_account", aSide: "top", bSide: "bottom" },
          { rel: "places", aSide: "right", bSide: "left" },
          { rel: "order_lines", aSide: "bottom", bSide: "top" },
          { rel: "product_lines", aSide: "left", bSide: "right", label: "appears as" },
          { rel: "classifies", aSide: "bottom", bSide: "top" },
          { rel: "supplies", aSide: "bottom", bSide: "right" },
          { rel: "stock", aSide: "bottom", bSide: "top" }
        ]
      },
      chen: {
        w: 1270, h: 712, minWidth: 800,
        note: "<strong>Chen</strong> is a conceptual notation: no foreign keys and no junction tables. ORDER_ITEM appears as the many-to-many relationship CONTAINS, which owns the attributes quantity and unit_price.",
        pos: { customer: { x: 220, y: 330 }, user_account: { x: 220, y: 600 }, orders: { x: 560, y: 330 }, product: { x: 900, y: 330 },
               category: { x: 740, y: 90 }, supplier: { x: 1060, y: 90 }, inventory: { x: 900, y: 600 } },
        weak: ["inventory"],
        attrs: {
          customer: [["customer_id", -150, -62, 1], ["first_name", -172, -8], ["last_name", -160, 46], ["address_line", -128, 100], ["email", -70, -98], ["phone", 40, -100], ["postcode", 125, -82], ["registered_on", 130, 86]],
          user_account: [["account_id", -150, -25, 1], ["username", -150, 32], ["password_hash", 0, 78], ["created_at", 150, 30]],
          orders: [["order_id", -60, -88, 1], ["order_date", 58, -92], ["status", 0, 88]],
          product: [["product_id", 135, -45, 1], ["name", 155, 10], ["price", 130, 62]],
          category: [["category_id", -160, -25, 1], ["name", -165, 30], ["description", -10, -62], ["vat_rate", 135, -48]],
          supplier: [["supplier_id", -5, -62, 1], ["name", 140, -40], ["email", 160, 10], ["phone", 135, 58], ["city", -115, 55]],
          inventory: [["qty_in_stock", 160, -25], ["reorder_level", 165, 30], ["last_restocked", 0, 78]]
        },
        rels: {
          has_account: { x: 220, y: 465 }, places: { x: 390, y: 330 },
          contains: { x: 730, y: 330, attrs: [["quantity", -52, 74], ["unit_price", 62, 74]] },
          classifies: { x: 820, y: 210 }, supplies: { x: 980, y: 210 }, stock: { x: 900, y: 465 }
        }
      }
    }
  };

  /* ---------------- Relationship-type examples ---------------- */
  M.one_to_one = {
    title: "One-to-one: CUSTOMER has USER_ACCOUNT",
    entities: { customer: trim("customer", ["customer_id", "first_name", "last_name", "email"]), user_account: trim("user_account", ["account_id", "customer_id", "username", "password_hash"]) },
    rels: pick(["has_account"]),
    views: {
      crow: { w: 620, h: 170, minWidth: 520, pos: { customer: { x: 20, y: 20 }, user_account: { x: 370, y: 20 } }, links: [{ rel: "has_account", aSide: "right", bSide: "left" }] },
      chen: { w: 700, h: 230, minWidth: 560, pos: { customer: { x: 150, y: 115 }, user_account: { x: 550, y: 115 } },
        attrs: { customer: [["customer_id", -60, -75, 1], ["email", 55, -75], ["first_name", -95, 72], ["last_name", 40, 76]], user_account: [["account_id", -55, -75, 1], ["username", 60, -75], ["password_hash", 10, 76]] },
        rels: { has_account: { x: 350, y: 115 } } }
    }
  };
  M.one_to_many = {
    title: "One-to-many: CUSTOMER places ORDERS",
    entities: { customer: trim("customer", ["customer_id", "first_name", "last_name", "email"]), orders: E.orders },
    rels: pick(["places"]),
    views: {
      crow: { w: 620, h: 170, minWidth: 520, pos: { customer: { x: 20, y: 20 }, orders: { x: 370, y: 20 } }, links: [{ rel: "places", aSide: "right", bSide: "left" }] },
      chen: { w: 700, h: 230, minWidth: 560, pos: { customer: { x: 150, y: 115 }, orders: { x: 550, y: 115 } },
        attrs: { customer: [["customer_id", -60, -75, 1], ["email", 55, -75], ["first_name", -95, 72], ["last_name", 40, 76]], orders: [["order_id", -50, -75, 1], ["order_date", 65, -75], ["status", 20, 76]] },
        rels: { places: { x: 350, y: 115 } } }
    }
  };
  M.many_to_many = {
    title: "Many-to-many: ORDERS contain PRODUCTS",
    entities: { orders: trim("orders", ["order_id", "order_date", "status"]), product: trim("product", ["product_id", "name", "price"]) },
    rels: pick(["contains"]),
    views: {
      crow: { w: 620, h: 150, minWidth: 520,
        note: "A conceptual Crow’s Foot sketch can show M:N directly (crow’s feet at both ends), but <strong>a relational database cannot store it as drawn</strong>. See ‘Mapping ER diagrams to tables’ for the fix.",
        pos: { orders: { x: 20, y: 20 }, product: { x: 370, y: 20 } }, links: [{ rel: "contains", aSide: "right", bSide: "left" }] },
      chen: { w: 700, h: 250, minWidth: 560, pos: { orders: { x: 150, y: 110 }, product: { x: 550, y: 110 } },
        attrs: { orders: [["order_id", -55, -72, 1], ["order_date", 60, -74], ["status", -40, 74]], product: [["product_id", -50, -72, 1], ["name", 65, -72], ["price", 45, 74]] },
        rels: { contains: { x: 350, y: 110, attrs: [["quantity", -50, 80], ["unit_price", 55, 80]] } } }
    }
  };
  M.mn_resolved = {
    title: "M:N resolved with the junction table ORDER_ITEM",
    entities: { orders: trim("orders", ["order_id", "order_date", "status"]), order_item: E.order_item, product: trim("product", ["product_id", "name", "price"]) },
    rels: pick(["order_lines", "product_lines"]),
    views: {
      crow: { w: 900, h: 160, minWidth: 720, pos: { orders: { x: 20, y: 20 }, order_item: { x: 335, y: 20 }, product: { x: 650, y: 20 } },
        links: [{ rel: "order_lines", aSide: "right", bSide: "left" }, { rel: "product_lines", aSide: "left", bSide: "right", label: "appears as" }] }
    }
  };

  /* ---------------- Seminar model answer: Fruit shop ---------------- */
  var F = {
    customer: { label: "CUSTOMER", attrs: [["customer_id", "PK", "INTEGER"], ["customer_name", "", "TEXT"], ["postcode", "", "TEXT"], ["phone", "", "TEXT"]],
      note: "The flat file only gives first names and several customers share a phone number, so a surrogate key customer_id is needed." },
    store: { label: "STORE", attrs: [["store_id", "PK", "INTEGER"], ["store_name", "UQ", "TEXT"]] },
    product: { label: "PRODUCT", attrs: [["product_id", "PK", "INTEGER"], ["product_name", "UQ", "TEXT"], ["qty_in_stock", "", "INTEGER"]],
      note: "The data shows ONE stock level per product shared by both stores (e.g. Ice Cream 8 → 3 after Andy's order in Portsmouth), so qty_in_stock depends on the product alone." },
    sale: { label: "SALE", attrs: [["sale_id", "PK", "INTEGER"], ["customer_id", "FK", "INTEGER"], ["store_id", "FK", "INTEGER"]] },
    sale_line: { label: "SALE_LINE", attrs: [["sale_id", "PK, FK", "INTEGER"], ["product_id", "PK, FK", "INTEGER"], ["qty_ordered", "", "INTEGER"]] }
  };
  M.fruitshop = {
    title: "Fruit shop model answer (3NF)",
    entities: F,
    rels: {
      buys: { identifying: false, a: "customer", b: "sale", aEnd: [1, 1], bEnd: [0, "N"], verb: "makes", inv: "is made by", impl: "<code>sale.customer_id</code> NOT NULL REFERENCES <code>customer</code>" },
      sells: { identifying: false, a: "store", b: "sale", aEnd: [1, 1], bEnd: [0, "N"], verb: "records", inv: "is recorded at", impl: "<code>sale.store_id</code> NOT NULL REFERENCES <code>store</code>" },
      lines: { identifying: true, a: "sale", b: "sale_line", aEnd: [1, 1], bEnd: [1, "N"], verb: "contains", inv: "belongs to", impl: "<code>sale_line.sale_id</code> REFERENCES <code>sale</code>" },
      prod_lines: { identifying: true, a: "product", b: "sale_line", aEnd: [1, 1], bEnd: [0, "N"], verb: "appears as", inv: "refers to", impl: "<code>sale_line.product_id</code> REFERENCES <code>product</code>" }
    },
    views: {
      crow: { w: 1130, h: 300, minWidth: 820,
        pos: { customer: { x: 20, y: 20 }, sale: { x: 310, y: 20 }, sale_line: { x: 600, y: 20 }, product: { x: 890, y: 20 }, store: { x: 310, y: 190 } },
        links: [
          { rel: "buys", aSide: "right", bSide: "left" }, { rel: "lines", aSide: "right", bSide: "left" },
          { rel: "prod_lines", aSide: "left", bSide: "right" }, { rel: "sells", aSide: "top", bSide: "bottom" }
        ] }
    }
  };

  /* ---------------- Week 2: tables added for triggers (shop_v2) ---------------- */
  M.shop_v2_logs = {
    title: "Online Shop v2: tables maintained by triggers",
    entities: {
      product: trim("product", ["product_id", "name", "price", "category_id", "supplier_id"]),
      inventory: E.inventory,
      stock_movement: { label: "STOCK_MOVEMENT", desc: "one row per change to stock, written by triggers", attrs: [
        ["movement_id", "PK", "INTEGER"], ["product_id", "FK", "INTEGER"], ["qty_change", "", "INTEGER"], ["reason", "", "TEXT"], ["order_id", "", "INTEGER"], ["moved_at", "", "TEXT"]],
        note: "order_id is kept for reference but deliberately has NO foreign key, so the history survives if an order is ever deleted." },
      price_history: { label: "PRICE_HISTORY", desc: "audit trail of price changes", attrs: [
        ["history_id", "PK", "INTEGER"], ["product_id", "FK", "INTEGER"], ["old_price", "", "REAL"], ["new_price", "", "REAL"], ["changed_at", "", "TEXT"]] },
      reorder_alert: { label: "REORDER_ALERT", desc: "raised when stock falls to the reorder level", attrs: [
        ["alert_id", "PK", "INTEGER"], ["product_id", "FK", "INTEGER"], ["qty_in_stock", "", "INTEGER"], ["reorder_level", "", "INTEGER"], ["raised_at", "", "TEXT"], ["resolved", "", "INTEGER"]] },
      audit_log: { label: "AUDIT_LOG", desc: "general audit trail written by triggers", attrs: [
        ["log_id", "PK", "INTEGER"], ["table_name", "", "TEXT"], ["action", "", "TEXT"], ["row_key", "", "TEXT"], ["details", "", "TEXT"], ["logged_at", "", "TEXT"]],
        note: "Deliberately unconnected: an audit log must keep its rows even after the audited row is deleted." }
    },
    rels: {
      stock: R.stock,
      movements: { identifying: false, a: "product", b: "stock_movement", aEnd: [1, 1], bEnd: [0, "N"], verb: "has", inv: "is for",
        impl: "<code>stock_movement.product_id</code> NOT NULL REFERENCES <code>product</code> ON DELETE CASCADE" },
      prices: { identifying: false, a: "product", b: "price_history", aEnd: [1, 1], bEnd: [0, "N"], verb: "has", inv: "records a change to",
        impl: "<code>price_history.product_id</code> NOT NULL REFERENCES <code>product</code> ON DELETE CASCADE" },
      alerts: { identifying: false, a: "product", b: "reorder_alert", aEnd: [1, 1], bEnd: [0, "N"], verb: "raises", inv: "is about",
        impl: "<code>reorder_alert.product_id</code> NOT NULL REFERENCES <code>product</code> ON DELETE CASCADE" }
    },
    views: {
      crow: { w: 1140, h: 440, minWidth: 820,
        note: "Each new table is written <strong>by triggers</strong>, not by the application. AUDIT_LOG is deliberately unconnected.",
        pos: { stock_movement: { x: 20, y: 20 }, price_history: { x: 310, y: 20 }, reorder_alert: { x: 600, y: 20 }, audit_log: { x: 890, y: 20 },
               product: { x: 310, y: 270 }, inventory: { x: 600, y: 270 } },
        links: [
          { rel: "movements", aSide: "left", bSide: "bottom" },
          { rel: "prices", aSide: "top", bSide: "bottom" },
          { rel: "alerts", aSide: "top", bSide: "bottom", aT: 0.85, bT: 0.4 },
          { rel: "stock", aSide: "right", bSide: "left" }
        ] }
    }
  };

  /* ---------------- Unary (recursive) relationship ---------------- */
  // Based on the EMP table in the original Week 1 Database.db (empno, ename, job, mgr).
  M.unary = {
    title: "Unary relationship: an employee manages employees",
    entities: { emp: { label: "EMP", desc: "an employee of the shop", attrs: [["empno", "PK", "INTEGER"], ["ename", "", "TEXT"], ["job", "", "TEXT"], ["mgr", "FK", "INTEGER"]],
      note: "mgr is a foreign key that refers to empno in the SAME table." } },
    rels: { manages: { identifying: false, a: "emp", b: "emp", aEnd: [0, 1], bEnd: [0, "N"], verb: "manages", inv: "is managed by", chen: "MANAGES",
      roles: ["manager", "subordinate"],
      text: ["Each employee (as a manager) manages zero or many employees.", "Each employee (as a subordinate) is managed by zero or one employee: the managing director has no manager."],
      impl: "<code>emp.mgr</code> NULL-able REFERENCES <code>emp(empno)</code>: a self-referencing foreign key. NULL means ‘no manager’." } },
    views: {
      crow: { w: 420, h: 200, minWidth: 360, pos: { emp: { x: 40, y: 20 } }, links: [{ rel: "manages", aSide: "right", bSide: "bottom", aT: 0.55, bT: 0.7, loop: 40, label: "manages" }] },
      chen: { w: 560, h: 260, minWidth: 460, pos: { emp: { x: 150, y: 90 } },
        attrs: { emp: [["empno", -95, -55, 1], ["ename", 0, -68], ["job", -110, 40]] },
        rels: { manages: { x: 390, y: 190, aAt: { x: 214, y: 90 }, bAt: { x: 150, y: 113 } } } }
    }
  };

  Q.erdModels = M;
})();
