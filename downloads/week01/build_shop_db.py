"""
build_shop_db.py: create the QHO541 Online Shop database (version 1).

Usage (Windows, macOS or Linux), from the folder containing this file:

    python build_shop_db.py            # creates shop_v1.db next to this script
    python build_shop_db.py my.db      # or choose another file name

Needs only the Python standard library. The script looks for
schema_v1.sql and seed_v1.sql in the SAME folder as itself, so it works
no matter which folder you run it from (no hard-coded C:\\Users\\... paths).
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent          # folder this script lives in
SCHEMA = HERE / "schema_v1.sql"
SEED = HERE / "seed_v1.sql"


def build(db_path: Path) -> None:
    """Create a fresh database at db_path from the schema and seed scripts."""
    if db_path.exists():
        db_path.unlink()                          # start from a clean file every time

    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA foreign_keys = ON")   # SQLite leaves FKs OFF unless asked
        con.executescript(SCHEMA.read_text(encoding="utf-8"))
        con.executescript(SEED.read_text(encoding="utf-8"))
        con.commit()

        # Sanity checks: both must return no problems
        problems = con.execute("PRAGMA foreign_key_check").fetchall()
        integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
        if problems or integrity != "ok":
            raise RuntimeError(f"Database checks failed: {problems or integrity}")

        print(f"Created {db_path.name} (SQLite {sqlite3.sqlite_version})")
        tables = [r[0] for r in con.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")]
        for t in tables:
            n = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
            print(f"  {t:<14} {n:>3} rows")
    finally:
        con.close()


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "shop_v1.db"
    build(target)
