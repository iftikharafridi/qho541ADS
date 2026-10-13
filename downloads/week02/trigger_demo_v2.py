"""
trigger_demo_v2.py: Week 2 worked example. Watch the shop's triggers work from Python.

Run build_shop_db_v2.py first, then:   python trigger_demo_v2.py

The demo copies shop_v2.db into memory and works on the copy, so the file on
disk is never changed and you can run it as often as you like.
Standard library only.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "shop_v2.db"


def open_copy(path: Path = DB_PATH) -> sqlite3.Connection:
    """Load the database into memory so the demo never changes the real file."""
    if not path.exists():
        raise SystemExit(f"{path.name} not found. Run build_shop_db_v2.py first.")
    disk = sqlite3.connect(path)
    mem = sqlite3.connect(":memory:")
    disk.backup(mem)                          # copy every table, view and trigger
    disk.close()
    mem.row_factory = sqlite3.Row
    mem.execute("PRAGMA foreign_keys = ON")
    return mem


def stock(con: sqlite3.Connection, product_id: int) -> int:
    return con.execute("SELECT qty_in_stock FROM inventory WHERE product_id = ?", (product_id,)).fetchone()[0]


def add_line(con, order_id, product_id, qty, price) -> None:
    """Insert one order line; the triggers decide whether it is allowed."""
    try:
        with con:                                             # commit, or roll back on error
            con.execute("INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                        (order_id, product_id, qty, price))
        print(f"  OK: added {qty} x product {product_id} to order {order_id}")
    except sqlite3.IntegrityError as err:                     # RAISE(ABORT, ...) arrives here
        print(f"  Refused by a trigger: {err}")


def main() -> None:
    con = open_copy()

    print("1. A normal sale: AFTER INSERT reduces stock and logs the movement")
    before = stock(con, 9)
    add_line(con, 1009, 9, 2, 2.10)                           # 2 x Basmati Rice into a Pending order
    print(f"  Basmati Rice stock: {before} -> {stock(con, 9)}")

    print("\n2. Not enough stock: BEFORE INSERT raises an error and nothing changes")
    before = stock(con, 7)
    add_line(con, 1009, 7, 10, 3.40)                          # only 4 Cheddar in stock
    print(f"  Cheddar stock still {stock(con, 7)} (was {before})")

    print("\n3. A cascade: the sale trigger updates inventory, which fires the reorder trigger")
    add_line(con, 1008, 3, 16, 1.75)                          # Orange Juice 35 -> 19, reorder level 20
    for r in con.execute("SELECT product_id, qty_in_stock, reorder_level FROM reorder_alert"):
        print(f"  Reorder alert: product {r['product_id']} has {r['qty_in_stock']} (level {r['reorder_level']})")

    print("\n4. Locked orders: order 1001 has been delivered")
    add_line(con, 1001, 9, 1, 2.10)

    print("\n5. Cancelling order 1009 returns its stock (AFTER UPDATE OF status)")
    print(f"  Rice before cancel: {stock(con, 9)}")
    with con:
        con.execute("UPDATE orders SET status = 'Cancelled' WHERE order_id = ?", (1009,))
    print(f"  Rice after cancel:  {stock(con, 9)}")

    print("\n6. Price change audit (AFTER UPDATE OF price ... WHEN NEW.price <> OLD.price)")
    with con:
        con.execute("UPDATE product SET price = 0.90 WHERE product_id = 1")
    for r in con.execute("SELECT old_price, new_price FROM price_history WHERE product_id = 1 ORDER BY history_id"):
        print(f"  Cola: {r['old_price']:.2f} -> {r['new_price']:.2f}")

    print("\n7. Stock movements recorded by the triggers in this demo")
    for r in con.execute("SELECT product_id, qty_change, reason, order_id FROM stock_movement ORDER BY movement_id"):
        print(f"  product {r['product_id']:>2}  {r['qty_change']:+4d}  {r['reason']:<16} order {r['order_id']}")
    con.close()


if __name__ == "__main__":
    main()
