"""
Content tests for the QHO541 site. Run from the repository root:

    python -m pytest -q tests/test_content.py

Checks that
  * the Online Shop database builds and passes integrity / FK checks;
  * every SQL example on the pages runs against the database it targets;
  * every playground's default SQL runs (or fails only where intended);
  * the ER diagram models match the real SQLite schema (columns, PKs, FKs, UNIQUE);
  * the normalisation walkthrough is lossless (2NF and 3NF join back to 1NF);
  * the downloadable Python scripts run;
  * internal links, anchors and downloads all resolve;
  * quiz data is valid.
"""
from __future__ import annotations

import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
PAGES = [ROOT / "index.html", ROOT / "setup.html", ROOT / "assessment.html"] + sorted((ROOT / "weeks").glob("week*.html"))


def soup(p: Path) -> BeautifulSoup:
    return BeautifulSoup(p.read_text(encoding="utf-8"), "html.parser")


def fresh_db(name: str, setup_sql: str = "") -> sqlite3.Connection:
    con = sqlite3.connect(":memory:")
    if name != "empty":
        src = sqlite3.connect(ROOT / "data" / f"{name}.db")
        src.backup(con)
        src.close()
    con.execute("PRAGMA foreign_keys = ON")
    if setup_sql:
        con.executescript(setup_sql)
    return con


def split_statements(sql: str) -> list[str]:
    out, buf = [], ""
    for line in sql.splitlines(keepends=True):
        buf += line
        if sqlite3.complete_statement(buf):
            if buf.strip():
                out.append(buf.strip())
            buf = ""
    if buf.strip() and not all(l.strip().startswith("--") or not l.strip() for l in buf.splitlines()):
        out.append(buf.strip())
    return out


# ---------------------------------------------------------------- database
def test_database_integrity():
    con = sqlite3.connect(ROOT / "data" / "shop_v1.db")
    con.execute("PRAGMA foreign_keys = ON")
    assert con.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    assert con.execute("PRAGMA foreign_key_check").fetchall() == []
    tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")]
    assert len(tables) >= 5
    for t in tables:  # the brief asks for >= 5 records per table; the teaching DB models that
        assert con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] >= 5, t


def test_download_db_matches_site_db():
    a = (ROOT / "data" / "shop_v1.db").read_bytes()
    b = (ROOT / "downloads" / "week01" / "shop_v1.db").read_bytes()
    assert a == b


@pytest.mark.parametrize("sql_file", sorted((ROOT / "db" / "seminar").glob("*.sql")), ids=lambda p: p.name)
def test_seminar_answers_build(sql_file):
    base = "shop_v1" if sql_file.name.startswith("w2_") else "empty"      # Week 2 answers extend shop_v1
    con = fresh_db(base, sql_file.read_text(encoding="utf-8"))
    assert con.execute("PRAGMA foreign_key_check").fetchall() == []


def test_downloads_match_sources():
    """Every downloadable copy is byte-identical to its source in db/."""
    for dl in (ROOT / "downloads").rglob("*"):
        if dl.suffix in (".sql", ".py"):
            src = ROOT / "db" / dl.relative_to(dl.parents[1] if dl.parent.name == "seminar" else dl.parent).as_posix()
            if dl.parent.name == "seminar":
                src = ROOT / "db" / "seminar" / dl.name
            assert src.exists() and src.read_bytes() == dl.read_bytes(), dl


# ---------------------------------------------------------------- Week 2: triggers
def v2():
    return fresh_db("shop_v2")


def test_v2_trigger_inventory():
    con = v2()
    trig = {r[0]: r[1] for r in con.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'")}
    assert len(trig) == 18
    # the assessment minimum is demonstrated: every event and every timing appears
    for event in ("INSERT", "UPDATE", "DELETE"):
        assert any(re.search(rf"\b{event}\b(\s+OF\b[^O]*)?\s+ON", sql, re.I) for sql in trig.values()), event
    for timing in ("BEFORE", "AFTER", "INSTEAD OF"):
        assert any(re.search(rf"\b{timing}\b", sql) for sql in trig.values()), timing


def trigger_lab_scenarios():
    for p in PAGES:
        for lab in soup(p).select(".trigger-lab"):
            for sc in json.loads(lab.select_one('script[type="application/json"]').get_text()):
                yield pytest.param(lab.get("data-db", "shop_v2"), sc, id=f"{p.name}:{sc['title'][:30]}")


@pytest.mark.parametrize("db,sc", list(trigger_lab_scenarios()))
def test_trigger_lab_scenarios(db, sc):
    con = fresh_db(db)
    names = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='trigger'")}
    for t in re.findall(r"trg_\w+", json.dumps(sc)):
        assert t in names, f"scenario mentions unknown trigger {t}"
    for w in sc["watch"]:
        con.execute(w["sql"]).fetchall()
    before = [con.execute(w["sql"]).fetchall() for w in sc["watch"]]
    if sc["expect"] == "error":
        with pytest.raises(sqlite3.IntegrityError):
            con.executescript(sc["sql"])
        after = [con.execute(w["sql"]).fetchall() for w in sc["watch"]]
        assert after == before, "a refused statement must leave the watched rows unchanged"
    else:
        con.executescript(sc["sql"])
        after = [con.execute(w["sql"]).fetchall() for w in sc["watch"]]
        assert after != before, "a successful scenario should visibly change something"


def test_v2_business_rules():
    con = v2()
    inv = lambda p: con.execute("SELECT qty_in_stock FROM inventory WHERE product_id=?", (p,)).fetchone()[0]
    con.execute("INSERT INTO order_item VALUES (1009, 9, 2, 2.10)"); assert inv(9) == 68
    with pytest.raises(sqlite3.IntegrityError, match="Not enough stock"):
        con.execute("INSERT INTO order_item VALUES (1009, 7, 10, 3.40)")
    con.execute("UPDATE order_item SET quantity = 5 WHERE order_id = 1009 AND product_id = 9"); assert inv(9) == 65
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("UPDATE order_item SET product_id = 2 WHERE order_id = 1009 AND product_id = 9")
    con.execute("UPDATE orders SET status='Cancelled' WHERE order_id=1009"); assert inv(9) == 70
    with pytest.raises(sqlite3.IntegrityError, match="can no longer be changed"):
        con.execute("DELETE FROM order_item WHERE order_id = 1009")
    with pytest.raises(sqlite3.IntegrityError, match="Only Pending"):
        con.execute("DELETE FROM orders WHERE order_id = 1009")
    con.execute("INSERT INTO orders (order_id, customer_id, status) VALUES (3000, 8, 'Pending')")
    con.execute("INSERT INTO order_item VALUES (3000, 2, 5, 0.60)"); assert inv(2) == 175
    con.execute("DELETE FROM orders WHERE order_id = 3000"); assert inv(2) == 180      # FK cascade fires DELETE trigger
    moves = con.execute("SELECT SUM(qty_change) FROM stock_movement WHERE product_id = 2").fetchone()[0]
    assert moves == 0
    assert con.execute("PRAGMA foreign_key_check").fetchall() == []


def test_week02_scripts(tmp_path):
    for f in ["schema_v1.sql", "seed_v1.sql", "migration_v2_triggers.sql", "build_shop_db_v2.py", "trigger_demo_v2.py"]:
        (tmp_path / f).write_bytes((ROOT / "downloads" / "week02" / f).read_bytes())
    b = subprocess.run([sys.executable, "build_shop_db_v2.py"], cwd=tmp_path, capture_output=True, text=True)
    assert b.returncode == 0 and "18 triggers" in b.stdout, b.stderr
    before = (tmp_path / "shop_v2.db").read_bytes()
    e = subprocess.run([sys.executable, str(tmp_path / "trigger_demo_v2.py")], cwd=ROOT, capture_output=True, text=True)
    assert e.returncode == 0, e.stderr
    page = soup(ROOT / "weeks" / "week02.html")
    expected = [c.get_text() for c in page.select("details.expand code.language-plaintext")][0]
    assert e.stdout.strip() == expected.strip(), "the expected output shown on the page differs from the real output"
    assert (tmp_path / "shop_v2.db").read_bytes() == before, "the demo must not modify the database file"


# ---------------------------------------------------------------- page SQL
def code_blocks():
    for p in PAGES:
        for code in soup(p).select('code.language-sql[data-test]'):
            yield pytest.param(code.get("data-test"), code.get_text(), id=f"{p.name}:{code.get('data-file') or 'block'}")


@pytest.mark.parametrize("db,sql", list(code_blocks()))
def test_marked_sql_blocks_run(db, sql):
    con = fresh_db(db)
    for st in split_statements(sql):
        con.execute(st).fetchall()


def schema_extract_blocks():
    """Extracts labelled 'xxx.sql (extract)' must appear verbatim in db/xxx.sql (ignoring whitespace/comments)."""
    for p in PAGES:
        for code in soup(p).select('code.language-sql[data-file$="(extract)"]'):
            src = ROOT / "db" / code["data-file"].split(" ")[0]
            real = re.sub(r"\s+", "", re.sub(r"--[^\n]*", "", src.read_text(encoding="utf-8")))
            yield pytest.param(real, code.get_text(), id=f"{p.name}:{src.name}")


@pytest.mark.parametrize("real,extract", list(schema_extract_blocks()))
def test_schema_extracts_match_schema(real, extract):
    for st in split_statements(extract):
        norm = re.sub(r"\s+", "", re.sub(r"--[^\n]*", "", st)).rstrip(";")
        assert norm in real, f"extract differs from schema_v1.sql:\n{st}"


def playgrounds():
    for p in PAGES:
        for pg in soup(p).select(".playground"):
            sql = pg.select_one(".pg-sql").get_text()
            yield pytest.param(pg.get("data-db", "shop_v1"), pg.get("data-setup-src"),
                               "each" if pg.get("data-expect-error") == "true" else ("error" if pg.get("data-expect") == "error" else ""), sql,
                               id=f"{p.name}:{pg.get('data-title')}")


@pytest.mark.parametrize("db,setup_src,expect_error,sql", list(playgrounds()))
def test_playground_defaults(db, setup_src, expect_error, sql):
    setup = (ROOT / setup_src).read_text(encoding="utf-8") if setup_src else ""
    stmts = split_statements(sql)
    assert stmts, "playground has no SQL"
    if not expect_error:
        con = fresh_db(db, setup)
        for st in stmts:
            con.execute(st).fetchall()
    elif expect_error == "error":
        # the playground deliberately ends in an error (e.g. a trigger's RAISE)
        con = fresh_db(db, setup)
        with pytest.raises(sqlite3.DatabaseError):
            for st in stmts:
                con.execute(st).fetchall()
    else:
        # each statement is run on its own (as students are told to); all but the last must fail
        results = []
        for st in stmts:
            con = fresh_db(db, setup)
            try:
                con.execute(st).fetchall(); results.append(True)
            except sqlite3.DatabaseError:
                results.append(False)
        assert results[-1] is True, "final statement should succeed"
        assert not any(results[:-1]), f"statements expected to fail: {results}"


def test_seminar_q2_claim():
    con = fresh_db("shop_v1")
    names = sorted(r[0] for r in con.execute(
        "SELECT p.name FROM inventory i JOIN product p ON p.product_id=i.product_id WHERE i.qty_in_stock <= i.reorder_level"))
    assert names == ["Cheddar 400g", "Croissants 4 pack", "Margherita Pizza 500g"]
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("DELETE FROM supplier WHERE supplier_id = 5")


# ---------------------------------------------------------------- ERD vs schema
def load_models() -> dict:
    js = (ROOT / "assets" / "js" / "erd-models.js").read_text(encoding="utf-8")
    out = subprocess.run(["node", "-e", "global.window={};" + js + ";process.stdout.write(JSON.stringify(window.QHO541.erdModels))"],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


@pytest.mark.parametrize("model,dbname", [("shop", "shop_v1"), ("shop_v2_logs", "shop_v2")])
def test_erd_matches_schema(model, dbname):
    m = load_models()[model]
    con = sqlite3.connect(ROOT / "data" / f"{dbname}.db")
    for ent_id, ent in m["entities"].items():
        info = {r[1]: r for r in con.execute(f"PRAGMA table_info({ent_id})")}
        assert info, f"table {ent_id} missing"
        assert set(info) == {a[0] for a in ent["attrs"]}, f"{ent_id}: columns differ"
        fks = {r[3] for r in con.execute(f"PRAGMA foreign_key_list({ent_id})")}
        uniques = set()
        for idx in con.execute(f"PRAGMA index_list({ent_id})"):
            if idx[2] and idx[3] == "u":
                cols = [r[2] for r in con.execute(f"PRAGMA index_info('{idx[1]}')")]
                if len(cols) == 1:
                    uniques.add(cols[0])
        for name, keys, typ in ent["attrs"]:
            assert ("PK" in keys) == (info[name][5] > 0), f"{ent_id}.{name} PK flag"
            assert ("FK" in keys) == (name in fks), f"{ent_id}.{name} FK flag"
            assert ("UQ" in keys) == (name in uniques), f"{ent_id}.{name} UQ flag"
            assert info[name][2].upper() == typ, f"{ent_id}.{name} type"


@pytest.mark.parametrize("model,dbname", [("shop", "shop_v1"), ("shop_v2_logs", "shop_v2")])
def test_erd_relationships_match_foreign_keys(model, dbname):
    m = load_models()[model]
    con = sqlite3.connect(ROOT / "data" / f"{dbname}.db")
    for rid, r in m["rels"].items():
        if rid == "contains":           # conceptual M:N, implemented by order_item (checked via order_lines/product_lines)
            continue
        parent, child = r["a"], r["b"]
        assert r["aEnd"] == [1, 1], f"{rid}: parent end should be exactly one (NOT NULL FK)"
        fk = [x for x in con.execute(f"PRAGMA foreign_key_list({child})") if x[2] == parent]
        assert fk, f"{rid}: no FK from {child} to {parent}"
        col = fk[0][3]
        notnull = {x[1]: x[3] or x[5] > 0 for x in con.execute(f"PRAGMA table_info({child})")}[col]
        assert notnull, f"{rid}: FK {child}.{col} should be NOT NULL (mandatory parent)"
        # max-one at the child end requires uniqueness of the FK column
        if r["bEnd"][1] == 1:
            pk_cols = [x[1] for x in con.execute(f"PRAGMA table_info({child})") if x[5] > 0]
            uniq = pk_cols == [col] or any(
                idx[2] and [c[2] for c in con.execute(f"PRAGMA index_info('{idx[1]}')")] == [col]
                for idx in con.execute(f"PRAGMA index_list({child})"))
            assert uniq, f"{rid}: 1:1 needs UNIQUE on {child}.{col}"


def test_identifying_flags_match_schema():
    """Solid (identifying) lines exactly when the child's FK is part of its primary key."""
    sources = {"shop": fresh_db("shop_v1"), "shop_v2_logs": fresh_db("shop_v2"),
               "fruitshop": fresh_db("empty", (ROOT / "db" / "seminar" / "fruit_shop_3nf.sql").read_text(encoding="utf-8")),
               "unary": fresh_db("empty", (ROOT / "db" / "unary_emp.sql").read_text(encoding="utf-8"))}
    models = load_models()
    for name, con in sources.items():
        for rid, r in models[name]["rels"].items():
            if "identifying" not in r:
                continue
            fk = [x for x in con.execute(f"PRAGMA foreign_key_list({r['b']})") if x[2] == r["a"]]
            assert fk, f"{name}.{rid}: no FK"
            pk = {x[1] for x in con.execute(f"PRAGMA table_info({r['b']})") if x[5] > 0}
            assert (fk[0][3] in pk) == bool(r["identifying"]), f"{name}.{rid}: identifying flag wrong"


def test_unary_model_matches_sql():
    m = load_models()["unary"]
    con = fresh_db("empty", (ROOT / "db" / "unary_emp.sql").read_text(encoding="utf-8"))
    cols = {r[1] for r in con.execute("PRAGMA table_info(emp)")}
    assert cols == {a[0] for a in m["entities"]["emp"]["attrs"]}
    fk = con.execute("PRAGMA foreign_key_list(emp)").fetchall()
    assert fk and fk[0][2] == "emp" and fk[0][3] == "mgr"
    assert con.execute("SELECT COUNT(*) FROM emp WHERE mgr IS NULL").fetchone()[0] == 1   # 'zero or one' manager is real


def test_fruitshop_model_matches_answer():
    m = load_models()["fruitshop"]
    con = fresh_db("empty", (ROOT / "db" / "seminar" / "fruit_shop_3nf.sql").read_text(encoding="utf-8"))
    for ent_id, ent in m["entities"].items():
        cols = {r[1] for r in con.execute(f"PRAGMA table_info({ent_id})")}
        assert cols == {a[0] for a in ent["attrs"]}, ent_id


# ---------------------------------------------------------------- normalisation
def load_steps():
    return {s["id"]: s for s in json.loads((ROOT / "data" / "week01_normalisation.json").read_text(encoding="utf-8"))["steps"]}


def table_to_sqlite(con, t, name=None):
    cols = [c["n"] for c in t["cols"]]
    name = name or t["name"]
    con.execute(f'CREATE TABLE "{name}" ({", ".join(chr(34) + c + chr(34) for c in cols)})')
    con.executemany(f'INSERT INTO "{name}" VALUES ({",".join("?" * len(cols))})', [[str(v) for v in r] for r in t["rows"]])


def test_normalisation_lossless():
    steps = load_steps()
    one = steps["1nf"]["tables"][0]
    cols1 = [c["n"] for c in one["cols"]]
    expected = sorted(tuple(str(v) for v in r) for r in one["rows"])

    con = sqlite3.connect(":memory:")
    for t in steps["2nf"]["tables"]:
        table_to_sqlite(con, t)
    got2 = sorted(con.execute(f"""SELECT {", ".join(f'"{c}"' for c in cols1)}
        FROM order_line_2nf l JOIN orders_2nf o USING (order_no) JOIN product_2nf p USING (product)""").fetchall())
    assert got2 == expected

    con = sqlite3.connect(":memory:")
    for t in steps["3nf"]["tables"]:
        table_to_sqlite(con, t)
    expr = {"order_no": "o.order_no", "order_date": "o.order_date", "status": "o.status", "first_name": "c.first_name",
            "last_name": "c.last_name", "email": "c.email", "phone": "c.phone", "address_line": "c.address_line",
            "postcode": "c.postcode", "county": "a.county", "country": "a.country", "product": "p.product", "price": "p.price",
            "category": "cat.category", "vat_rate": "cat.vat_rate", "supplier": "s.supplier", "supplier_phone": "s.supplier_phone",
            "qty": "l.qty"}
    got3 = sorted(con.execute(f"""SELECT {", ".join(expr[c] for c in cols1)}
        FROM order_line l JOIN orders o ON o.order_no = l.order_no
        JOIN customer c ON c.customer_id = o.customer_id JOIN postcode_area a ON a.postcode = c.postcode
        JOIN product p ON p.product_id = l.product_id JOIN category cat ON cat.category_id = p.category_id
        JOIN supplier s ON s.supplier_id = p.supplier_id""").fetchall())
    assert got3 == expected


def test_1nf_key_and_dependencies_hold_in_data():
    """Every claimed FD holds in the sample data, and the composite key is needed (neither part is unique alone)."""
    one = load_steps()["1nf"]
    t = one["tables"][0]
    names = [c["n"] for c in t["cols"]]
    rows = [dict(zip(names, r)) for r in t["rows"]]
    pk = [c["n"] for c in t["cols"] if c["pk"]]
    assert pk == ["order_no", "product"] and names[:2] == pk, "composite key must be the two leading columns"
    assert len({(r["order_no"], r["product"]) for r in rows}) == len(rows)
    assert len({r["order_no"] for r in rows}) < len(rows) and len({r["product"] for r in rows}) < len(rows)
    for fd in one["fds"]:
        lhs = [x.strip() for x in fd["lhs"].split(",")]; rhs = [x.strip() for x in fd["rhs"].split(",")]
        seen = {}
        for r in rows:
            k = tuple(r[x] for x in lhs); v = tuple(r[x] for x in rhs)
            assert seen.setdefault(k, v) == v, f"FD {fd['lhs']} -> {fd['rhs']} violated by the data"
        if fd["kind"] == "partial":
            assert set(lhs) < set(pk)
        if fd["kind"] == "transitive":
            assert not set(lhs) & set(pk)
        if fd["kind"] != "full":
            # the redundancy the page claims must actually be visible: some determinant value repeats
            assert len({tuple(r[x] for x in lhs) for r in rows}) < len(rows), fd


def test_anomaly_claims_match_data():
    t = load_steps()["1nf"]["tables"][0]
    names = [c["n"] for c in t["cols"]]
    rows = [dict(zip(names, r)) for r in t["rows"]]
    assert sum(r["email"] == "jane.morris@example.com" for r in rows) == 4            # "Jane's details on four rows"
    assert sum(r["supplier"] == "Fizz & Co Drinks" for r in rows) == 3                # "Fizz & Co's phone on three"
    gone = [r for r in rows if r["order_no"] == 1003]
    rest = [r for r in rows if r["order_no"] != 1003]
    for col, val in [("email", "andy.green@example.com"), ("product", "Olive Oil 750ml"), ("supplier", "Home Foods Ltd")]:
        assert any(r[col] == val for r in gone) and not any(r[col] == val for r in rest), f"deleting 1003 should lose {val}"
    assert not any(r["product"] == "Garden Peas 900g" for r in rows)                  # insertion anomaly example is not yet ordered


def test_normalisation_3nf_no_duplicate_facts():
    for t in load_steps()["3nf"]["tables"]:
        pk = [i for i, c in enumerate(t["cols"]) if c["pk"]]
        keys = [tuple(r[i] for i in pk) for r in t["rows"]]
        assert len(keys) == len(set(keys)), f"duplicate key in {t['name']}"


def test_unf_matches_database_orders():
    """Orders 1001-1004 in the walkthrough are the same orders as in shop_v1.db."""
    one = load_steps()["1nf"]["tables"][0]
    names = [c["n"] for c in one["cols"]]
    con = fresh_db("shop_v1")
    for r in one["rows"]:
        row = dict(zip(names, r))
        q = con.execute("""SELECT oi.quantity, oi.unit_price FROM order_item oi JOIN product p ON p.product_id=oi.product_id
                           WHERE oi.order_id=? AND p.name=?""", (row["order_no"], row["product"])).fetchone()
        assert q is not None, row
        assert q[0] == row["qty"] and f"{q[1]:.2f}" == row["price"], row


# ---------------------------------------------------------------- python scripts
def test_python_scripts(tmp_path):
    for f in ["schema_v1.sql", "seed_v1.sql", "build_shop_db.py", "explore_shop_v1.py"]:
        (tmp_path / f).write_bytes((ROOT / "downloads" / "week01" / f).read_bytes())
    b = subprocess.run([sys.executable, "build_shop_db.py"], cwd=tmp_path, capture_output=True, text=True)
    assert b.returncode == 0, b.stderr
    # run from a DIFFERENT folder to prove paths are portable
    e = subprocess.run([sys.executable, str(tmp_path / "explore_shop_v1.py")], cwd=ROOT, capture_output=True, text=True)
    assert e.returncode == 0, e.stderr
    for expect in ["Blocked by FOREIGN KEY", "Blocked by UNIQUE", "Blocked by CHECK", "ACCEPTED", "1009      2026-01-20  Pending"]:
        assert expect in e.stdout
    con = sqlite3.connect(tmp_path / "shop_v1.db")
    assert con.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 10   # nothing changed permanently


def test_no_hardcoded_windows_paths():
    for f in list((ROOT / "downloads").rglob("*.py")) + list((ROOT / "db").rglob("*.py")):
        # a quoted string starting with a drive letter, e.g. "C:\\Users\\Admin\\db1.db"
        assert not re.search(r"""[rR]?["'][A-Za-z]:[\\/]""", f.read_text(encoding="utf-8")), f


# ---------------------------------------------------------------- links & quiz
def all_ids(p: Path) -> set[str]:
    s = soup(p)
    ids = {e["id"] for e in s.select("[id]")}
    for tpl in s.find_all("template"):
        ids |= {e["id"] for e in BeautifulSoup(tpl.decode_contents(), "html.parser").select("[id]")}
    return ids


def test_internal_links_and_anchors():
    problems = []
    for p in PAGES:
        s = soup(p)
        for tag, attr in [("a", "href"), ("link", "href"), ("script", "src"), ("img", "src")]:
            for el in s.find_all(tag):
                url = el.get(attr)
                if not url or re.match(r"^(https?:|mailto:|data:)", url):
                    continue
                path, _, frag = url.partition("#")
                target = (p.parent / path).resolve() if path else p
                if not target.exists():
                    problems.append(f"{p.name}: missing {url}")
                elif frag and target.suffix == ".html" and frag not in all_ids(target):
                    problems.append(f"{p.name}: missing anchor {url}")
        for pg in s.select("[data-setup-src]"):
            if not (ROOT / pg["data-setup-src"]).exists():
                problems.append(f"{p.name}: missing setup {pg['data-setup-src']}")
        for pg in s.select(".playground[data-db]"):
            if pg["data-db"] != "empty" and not (ROOT / "data" / f"{pg['data-db']}.db").exists():
                problems.append(f"{p.name}: missing db {pg['data-db']}")
        for st in s.select(".stepper[data-src], .anomaly[data-src]"):
            if not (ROOT / "data" / f"{st['data-src']}.json").exists():
                problems.append(f"{p.name}: missing data {st['data-src']}")
    assert not problems, "\n".join(problems)


def test_unique_ids_per_page():
    for p in PAGES:
        ids = [e["id"] for e in soup(p).select("[id]")]
        dup = {i for i in ids if ids.count(i) > 1}
        assert not dup, f"{p.name}: duplicate ids {dup}"


def test_erd_widgets_reference_models():
    models = load_models()
    for p in PAGES:
        for w in soup(p).select(".erd-widget"):
            assert w["data-model"] in models, f"{p.name}: unknown model {w['data-model']}"


def test_quiz_data():
    for p in PAGES:
        for q in soup(p).select(".quiz"):
            data = json.loads(q.select_one('script[type="application/json"]').get_text())
            assert len(data) >= 5
            for item in data:
                assert 0 <= item["answer"] < len(item["options"]) and item["explain"]


def test_search_index_fresh():
    idx = json.loads((ROOT / "assets" / "search-index.json").read_text(encoding="utf-8"))
    urls = {e["url"] for e in idx}
    assert any(u.startswith("weeks/week01.html#") for u in urls)
    for u in urls:
        page, _, frag = u.partition("#")
        assert frag in all_ids(ROOT / page), u
