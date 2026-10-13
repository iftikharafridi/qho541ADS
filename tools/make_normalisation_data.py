"""Generate data/week01_normalisation.json: the single source for the Week 1
normalisation walkthrough (web stepper, anomaly lab and Excel workbook).
Derived from the original 'Flat file NF1 to NF3 Example.xlsx' (Online Shop),
with spelling and data inconsistencies corrected and fictional contacts."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CUST = {
    "jane":   ["Jane", "Morris", "jane.morris@example.com", "07700 900101", "28 High Road, Southampton", "SO19 8JK", "Hampshire", "England"],
    "george": ["George", "Harris", "george.harris@example.com", "07700 900102", "15 Middle Road, Witney", "OX29 0HM", "Oxfordshire", "England"],
    "andy":   ["Andy", "Green", "andy.green@example.com", "07700 900103", "15 Middle Road, London", "EC1A 1BB", "City of London", "England"],
}
PROD = {  # name: price, category, vat, supplier, supplier_phone
    "Cola 330ml can":        [0.80, "Drinks", "20%", "Fizz & Co Drinks", "020 7946 0101"],
    "White Bread 800g":      [1.50, "Bakery", "0%", "Solent Bakery Ltd", "01632 960002"],
    "Sparkling Water 500ml": [0.60, "Drinks", "20%", "Fizz & Co Drinks", "020 7946 0101"],
    "Butter 250g":           [1.99, "Dairy", "0%", "Meadow Dairy", "01632 960005"],
    "Olive Oil 750ml":       [5.50, "Food Cupboard", "0%", "Home Foods Ltd", "0118 496 0003"],
    "Margherita Pizza 500g": [5.20, "Frozen", "0%", "Best Products Ltd", "0121 496 0004"],
}
ORDERS = [  # order_no, date, status, customer, [(product, qty)]
    (1001, "2025-09-25", "Delivered", "jane",   [("Cola 330ml can", 1), ("White Bread 800g", 2)]),
    (1002, "2025-09-26", "Delivered", "george", [("Sparkling Water 500ml", 2), ("Butter 250g", 5)]),
    (1003, "2025-10-10", "Delivered", "andy",   [("Olive Oil 750ml", 1), ("Margherita Pizza 500g", 3)]),
    (1004, "2025-11-10", "Delivered", "jane",   [("Cola 330ml can", 4), ("Margherita Pizza 500g", 1)]),
]

def money(x): return f"{x:.2f}"

def col(n, pk=False, fk=False): return {"n": n, "pk": pk, "fk": fk}

steps = []

# ---------- UNF ----------
unf_rows = []
for no, d, st, c, items in ORDERS:
    f, l, e, ph, addr, pc, county, country = CUST[c]
    item_lines = [f"{p} £{money(PROD[p][0])} | {PROD[p][1]} (VAT {PROD[p][2]}) | {PROD[p][3]} {PROD[p][4]} | qty {q}" for p, q in items]
    unf_rows.append([str(no), d, st, f"{f} {l}, {addr} {pc}", f"{e} / {ph}", f"{county}, {country}", item_lines])
steps.append({"id": "unf", "tables": [{
    "name": "online_shop_orders (spreadsheet)", "tag": "UNF",
    "cols": [col("order_no"), col("order_date"), col("status"), col("customer (name, address)"), col("contact"), col("area"), col("items ordered")],
    "rows": unf_rows, "multi": [3, 4, 5, 6]}]})

# ---------- 1NF ----------
# key columns first, so the composite primary key is visible at a glance
cols1 = ["order_no", "product", "order_date", "status", "first_name", "last_name", "email", "phone", "address_line", "postcode", "county", "country",
         "price", "category", "vat_rate", "supplier", "supplier_phone", "qty"]
rows1 = []
for no, d, st, c, items in ORDERS:
    for p, q in items:
        pr, cat, vat, sup, sph = PROD[p]
        rows1.append([no, p, d, st, *CUST[c], money(pr), cat, vat, sup, sph, q])
steps.append({"id": "1nf", "tables": [{
    "name": "order_line_1nf", "tag": "1NF",
    "cols": [col(n, pk=n in ("order_no", "product")) for n in cols1],
    "rows": rows1,
    "redundant": [["order_no", ["order_date", "status", "email"]],
                  ["email", ["first_name", "last_name", "phone", "address_line", "postcode"]],
                  ["postcode", ["county", "country"]],
                  ["product", ["price", "category", "supplier"]],
                  ["category", ["vat_rate"]],
                  ["supplier", ["supplier_phone"]]]}],
    "fds": [
        {"lhs": "order_no, product", "rhs": "qty", "kind": "full"},
        {"lhs": "order_no", "rhs": "order_date, status, email", "kind": "partial"},
        {"lhs": "product", "rhs": "price, category, supplier", "kind": "partial"},
        {"lhs": "email", "rhs": "first_name, last_name, phone, address_line, postcode", "kind": "transitive", "via": "order_no → email"},
        {"lhs": "postcode", "rhs": "county, country", "kind": "transitive", "via": "order_no → email → postcode"},
        {"lhs": "category", "rhs": "vat_rate", "kind": "transitive", "via": "product → category"},
        {"lhs": "supplier", "rhs": "supplier_phone", "kind": "transitive", "via": "product → supplier"}]})

# ---------- 2NF ----------
orders2, seen = [], set()
for no, d, st, c, items in ORDERS:
    orders2.append([no, d, st, *CUST[c]])
prod2, seenp = [], []
for no, d, st, c, items in ORDERS:
    for p, q in items:
        if p not in seenp:
            seenp.append(p); pr, cat, vat, sup, sph = PROD[p]; prod2.append([p, money(pr), cat, vat, sup, sph])
lines2 = [[no, p, q] for no, d, st, c, items in ORDERS for p, q in items]
steps.append({"id": "2nf", "tables": [
    {"name": "orders_2nf", "tag": "2NF", "cols": [col("order_no", pk=True), col("order_date"), col("status"), col("first_name"), col("last_name"), col("email"),
      col("phone"), col("address_line"), col("postcode"), col("county"), col("country")], "rows": orders2,
     "redundant": [["email", ["first_name", "last_name", "phone", "address_line", "postcode"]], ["postcode", ["county", "country"]]]},
    {"name": "product_2nf", "tag": "2NF", "cols": [col("product", pk=True), col("price"), col("category"), col("vat_rate"), col("supplier"), col("supplier_phone")], "rows": prod2,
     "redundant": [["category", ["vat_rate"]], ["supplier", ["supplier_phone"]]]},
    {"name": "order_line_2nf", "tag": "2NF", "cols": [col("order_no", pk=True, fk=True), col("product", pk=True, fk=True), col("qty")], "rows": lines2}],
    "fds": [
        {"lhs": "email", "rhs": "first_name, last_name, phone, address_line, postcode", "kind": "transitive"},
        {"lhs": "postcode", "rhs": "county, country", "kind": "transitive"},
        {"lhs": "category", "rhs": "vat_rate", "kind": "transitive"},
        {"lhs": "supplier", "rhs": "supplier_phone", "kind": "transitive"}]})

# ---------- 3NF ----------
cust_ids = {"jane": 1, "george": 2, "andy": 3}
customer3 = [[cust_ids[k], *v[:6]] for k, v in CUST.items()]
area3 = [[v[5], v[6], v[7]] for v in CUST.values()]
orders3 = [[no, d, st, cust_ids[c]] for no, d, st, c, items in ORDERS]
cats = []
for p in seenp:
    if PROD[p][1] not in [c[1] for c in cats]: cats.append([len(cats) + 1, PROD[p][1], PROD[p][2]])
sups = []
for p in seenp:
    if PROD[p][3] not in [s[1] for s in sups]: sups.append([len(sups) + 1, PROD[p][3], PROD[p][4]])
cat_id = {c[1]: c[0] for c in cats}; sup_id = {s[1]: s[0] for s in sups}
prod_ids = {p: i + 1 for i, p in enumerate(seenp)}
product3 = [[prod_ids[p], p, money(PROD[p][0]), cat_id[PROD[p][1]], sup_id[PROD[p][3]]] for p in seenp]
lines3 = [[no, prod_ids[p], q] for no, d, st, c, items in ORDERS for p, q in items]
steps.append({"id": "3nf", "tables": [
    {"name": "customer", "tag": "3NF", "cols": [col("customer_id", pk=True), col("first_name"), col("last_name"), col("email"), col("phone"), col("address_line"), col("postcode", fk=True)], "rows": customer3},
    {"name": "postcode_area", "tag": "3NF", "cols": [col("postcode", pk=True), col("county"), col("country")], "rows": area3},
    {"name": "orders", "tag": "3NF", "cols": [col("order_no", pk=True), col("order_date"), col("status"), col("customer_id", fk=True)], "rows": orders3},
    {"name": "category", "tag": "3NF", "cols": [col("category_id", pk=True), col("category"), col("vat_rate")], "rows": cats},
    {"name": "supplier", "tag": "3NF", "cols": [col("supplier_id", pk=True), col("supplier"), col("supplier_phone")], "rows": sups},
    {"name": "product", "tag": "3NF", "cols": [col("product_id", pk=True), col("product"), col("price"), col("category_id", fk=True), col("supplier_id", fk=True)], "rows": product3},
    {"name": "order_line", "tag": "3NF", "cols": [col("order_no", pk=True, fk=True), col("product_id", pk=True, fk=True), col("qty")], "rows": lines3}],
    "fds": []})

out = {"source": "Derived from Week-01 'Flat file NF1 to NF3 Example.xlsx' (Online Shop); corrected and extended.",
       "steps": steps}
(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "week01_normalisation.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print("wrote data/week01_normalisation.json", [len(s["tables"]) for s in steps])
