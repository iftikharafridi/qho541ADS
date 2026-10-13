"""
explore_shop_v1.py: Week 1 worked example.

Opens the normalised Online Shop database and shows:
  1. the tables and how many rows each holds
  2. how a JOIN rebuilds the original "flat file" from the 3NF tables
  3. a parameterised query (the safe way to put user input into SQL)
  4. foreign-key and UNIQUE constraints stopping bad data
  5. why PRAGMA foreign_keys = ON must be set on EVERY connection

Run build_shop_db.py first, then:   python explore_shop_v1.py
Standard library only. Nothing in the database is changed permanently.
"""
from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "shop_v1.db"


def connect(path: Path = DB_PATH, foreign_keys: bool = True) -> sqlite3.Connection:
    """Open the database with rows accessible by column name."""
    if not path.exists():
        raise SystemExit(f"{path.name} not found. Run build_shop_db.py first.")
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row               # rows behave like dictionaries
    if foreign_keys:
        con.execute("PRAGMA foreign_keys = ON")  # OFF by default in SQLite
    return con


def print_rows(title: str, rows: list[sqlite3.Row]) -> None:
    """Print query results as a simple aligned text table."""
    print(f"\n=== {title} ===")
    if not rows:
        print("(no rows)")
        return
    cols = rows[0].keys()
    widths = [max(len(str(c)), *(len(str(r[c])) for r in rows)) for c in cols]
    print("  ".join(str(c).ljust(w) for c, w in zip(cols, widths)))
    print("  ".join("-" * w for w in widths))
    for r in rows:
        print("  ".join(str(r[c]).ljust(w) for c, w in zip(cols, widths)))


def main() -> None:
    with closing(connect()) as con:
        # 1. Tables and row counts ----------------------------------------
        tables = [r["name"] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")]
        counts = [{"table": t, "rows": con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]}
                  for t in tables]
        print("\n=== Tables in shop_v1.db ===")
        for c in counts:
            print(f"  {c['table']:<14}{c['rows']:>4}")

        # 2. Rebuild the flat file with JOINs -----------------------------
        #    Normalisation splits data up; JOINs put it back together
        #    without losing anything (a "lossless" decomposition).
        flat = con.execute("""
            SELECT o.order_id,
                   c.first_name || ' ' || c.last_name AS customer,
                   p.name                             AS product,
                   cat.name                           AS category,
                   s.name                             AS supplier,
                   oi.quantity,
                   oi.unit_price
            FROM orders      AS o
            JOIN customer    AS c   ON c.customer_id   = o.customer_id
            JOIN order_item  AS oi  ON oi.order_id     = o.order_id
            JOIN product     AS p   ON p.product_id    = oi.product_id
            JOIN category    AS cat ON cat.category_id = p.category_id
            JOIN supplier    AS s   ON s.supplier_id   = p.supplier_id
            WHERE o.order_id BETWEEN 1001 AND 1004
            ORDER BY o.order_id, p.name
        """).fetchall()
        print_rows("Flat-file view rebuilt from 3NF tables (orders 1001-1004)", flat)

        # 3. Parameterised query --------------------------------------------
        #    The ? placeholder keeps user input as DATA, never as SQL code.
        email = "jane.morris@example.com"          # imagine this came from an Entry box
        rows = con.execute("""
            SELECT o.order_id, o.order_date, o.status
            FROM orders o JOIN customer c ON c.customer_id = o.customer_id
            WHERE c.email = ?
            ORDER BY o.order_date
        """, (email,)).fetchall()
        print_rows(f"Orders for {email}", rows)

        # 4a. Foreign key stops an order for a customer who does not exist --
        print("\n=== Constraint demonstrations ===")
        try:
            with con:                                  # commits on success, rolls back on error
                con.execute("INSERT INTO orders (order_id, customer_id) VALUES (?, ?)", (9999, 999))
        except sqlite3.IntegrityError as err:
            print(f"Blocked by FOREIGN KEY: {err}")

        # 4b. UNIQUE stops a second customer with the same e-mail ------------
        try:
            with con:
                con.execute("""INSERT INTO customer (first_name, last_name, email, address_line, postcode)
                               VALUES (?, ?, ?, ?, ?)""",
                            ("Janet", "Morrison", "jane.morris@example.com", "1 Any Street", "SO14 0AA"))
        except sqlite3.IntegrityError as err:
            print(f"Blocked by UNIQUE:      {err}")

        # 4c. CHECK stops a negative price ------------------------------------
        try:
            with con:
                con.execute("UPDATE product SET price = ? WHERE product_id = ?", (-1.00, 1))
        except sqlite3.IntegrityError as err:
            print(f"Blocked by CHECK:       {err}")

    # 5. Foreign keys are a per-connection setting ---------------------------
    with closing(connect(foreign_keys=False)) as con:
        con.execute("INSERT INTO orders (order_id, customer_id) VALUES (9999, 999)")
        print("\nWithout PRAGMA foreign_keys = ON the same bad INSERT is ACCEPTED.")
        con.rollback()                                 # undo it: nothing is saved
        print("(Rolled back, so the database is unchanged. Always switch foreign keys on!)")


if __name__ == "__main__":
    main()
