"""
build_shop_db_v2.py: create the QHO541 Online Shop database, version 2 (Week 2).

    python build_shop_db_v2.py            # creates shop_v2.db next to this script

Version 2 = version 1 (schema_v1.sql + seed_v1.sql) + migration_v2_triggers.sql.
The migration is applied AFTER the sample data is loaded, so the triggers do not
re-process last year's orders: stock levels in seed_v1.sql are already current.
Standard library only; all three .sql files must be in the same folder as this script.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPTS = ["schema_v1.sql", "seed_v1.sql", "migration_v2_triggers.sql"]


def build(db_path: Path) -> None:
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA foreign_keys = ON")
        for name in SCRIPTS:
            con.executescript((HERE / name).read_text(encoding="utf-8"))
        con.commit()
        problems = con.execute("PRAGMA foreign_key_check").fetchall()
        integrity = con.execute("PRAGMA integrity_check").fetchone()[0]
        if problems or integrity != "ok":
            raise RuntimeError(f"Database checks failed: {problems or integrity}")
        print(f"Created {db_path.name} (SQLite {sqlite3.sqlite_version})")
        for kind in ("table", "view", "trigger"):
            names = [r[0] for r in con.execute(
                "SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE 'sqlite_%' ORDER BY name", (kind,))]
            print(f"  {len(names):>2} {kind}s: {', '.join(names)}")
    finally:
        con.close()


if __name__ == "__main__":
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "shop_v2.db")
