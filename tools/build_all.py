"""
build_all.py: regenerate every derived file in the site.

    python tools/build_all.py

1. data/week01_normalisation.json   (normalisation walkthrough data)
2. data/shop_v1.db                  (database used by the in-browser playgrounds)
3. downloads/week01/...             (student downloads + a ZIP of them all)
4. downloads/week01/week01_normalisation_walkthrough.xlsx
5. assets/search-index.json         (site search)

Build-time requirements: Python 3.10+, openpyxl and beautifulsoup4
(pip install openpyxl beautifulsoup4). The *site* itself needs nothing.
"""
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_SRC = ROOT / "db"
DATA = ROOT / "data"
DL1 = ROOT / "downloads" / "week01"


def load_builder():
    spec = importlib.util.spec_from_file_location("build_shop_db", DB_SRC / "build_shop_db.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_module(name: str):
    spec = importlib.util.spec_from_file_location(name, DB_SRC / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def build_databases() -> None:
    DATA.mkdir(exist_ok=True)
    load_builder().build(DATA / "shop_v1.db")
    load_module("build_shop_db_v2").build(DATA / "shop_v2.db")


def build_week01_downloads() -> None:
    DL1.mkdir(parents=True, exist_ok=True)
    (DL1 / "seminar").mkdir(exist_ok=True)
    for name in ["schema_v1.sql", "seed_v1.sql", "build_shop_db.py", "explore_shop_v1.py", "unary_emp.sql"]:
        shutil.copy2(DB_SRC / name, DL1 / name)
    shutil.copy2(DATA / "shop_v1.db", DL1 / "shop_v1.db")
    for f in sorted((DB_SRC / "seminar").glob("*_3nf.sql")):     # Week 1 answers only
        shutil.copy2(f, DL1 / "seminar" / f.name)
    make_workbook(DL1 / "week01_normalisation_walkthrough.xlsx")
    readme = DL1 / "README.txt"
    readme.write_text(
        "QHO541 Week 1: Normalisation and ER diagrams\n"
        "============================================\n\n"
        "shop_v1.db                 Ready-made Online Shop database (open in DB Browser for SQLite)\n"
        "schema_v1.sql              CREATE TABLE statements (3NF schema with constraints)\n"
        "seed_v1.sql                Sample data (every table has 5+ rows)\n"
        "build_shop_db.py           Rebuilds shop_v1.db from the two .sql files\n"
        "explore_shop_v1.py         Lecture worked example: JOINs, parameterised queries, constraints\n"
        "week01_normalisation_walkthrough.xlsx   UNF -> 1NF -> 2NF -> 3NF worked example\n"
        "unary_emp.sql              Unary (self-referencing) relationship example: EMP manages EMP\n"
        "seminar/*.sql              Model answers for the seminar normalisation tasks\n\n"
        "Run (Windows):   py build_shop_db.py   then   py explore_shop_v1.py\n"
        "Run (macOS/Linux): python3 build_shop_db.py   then   python3 explore_shop_v1.py\n"
        "Only the Python standard library is needed.\n", encoding="utf-8")
    zpath = DL1 / "qho541_week01_files.zip"
    if zpath.exists():
        zpath.unlink()
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(DL1.rglob("*")):
            if f.is_file() and f != zpath:
                z.write(f, Path("week01") / f.relative_to(DL1))


DL2 = ROOT / "downloads" / "week02"


def build_week02_downloads() -> None:
    DL2.mkdir(parents=True, exist_ok=True)
    (DL2 / "seminar").mkdir(exist_ok=True)
    for name in ["schema_v1.sql", "seed_v1.sql", "migration_v2_triggers.sql", "build_shop_db_v2.py", "trigger_demo_v2.py"]:
        shutil.copy2(DB_SRC / name, DL2 / name)
    shutil.copy2(DATA / "shop_v1.db", DL2 / "shop_v1.db")
    shutil.copy2(DATA / "shop_v2.db", DL2 / "shop_v2.db")
    for f in sorted((DB_SRC / "seminar").glob("w2_*.sql")):
        shutil.copy2(f, DL2 / "seminar" / f.name)
    (DL2 / "README.txt").write_text(
        "QHO541 Week 2: Database triggers\n"
        "================================\n\n"
        "shop_v2.db                 Online Shop with 18 triggers, 4 log tables and 1 view (open in DB Browser)\n"
        "shop_v1.db                 Week 1 database with NO triggers: use it to write your own in the seminar\n"
        "schema_v1.sql, seed_v1.sql Week 1 schema and data\n"
        "migration_v2_triggers.sql  Everything added in Week 2: tables, triggers and the v_order_lines view\n"
        "build_shop_db_v2.py        Rebuilds shop_v2.db = schema_v1 + seed_v1 + migration_v2\n"
        "trigger_demo_v2.py         Lecture worked example: watch the triggers from Python (uses an in-memory copy)\n"
        "seminar/w2_*.sql           Model answers for the seminar activities (run against shop_v1)\n\n"
        "Run (Windows):   py build_shop_db_v2.py   then   py trigger_demo_v2.py\n"
        "Only the Python standard library is needed.\n", encoding="utf-8")
    zpath = DL2 / "qho541_week02_files.zip"
    if zpath.exists():
        zpath.unlink()
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(DL2.rglob("*")):
            if f.is_file() and f != zpath:
                z.write(f, Path("week02") / f.relative_to(DL2))


def make_workbook(path: Path) -> None:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    data = json.loads((DATA / "week01_normalisation.json").read_text(encoding="utf-8"))
    head_fill = PatternFill("solid", fgColor="1D4F91")
    pk_font = Font(bold=True, color="FFFFFF", underline="single")
    wb = Workbook()
    wb.remove(wb.active)
    notes = {
        "unf": "Unnormalised form: the client's spreadsheet. Several cells hold more than one value and the items repeat inside one cell.",
        "1nf": "1NF: every cell atomic, one row per order line, primary key (order_no, product). Redundancy remains.",
        "2nf": "2NF: partial dependencies on order_no or product alone moved to their own tables.",
        "3nf": "3NF: transitive dependencies removed (customer, postcode area, category VAT, supplier phone).",
    }
    titles = {"unf": "UNF", "1nf": "1NF", "2nf": "2NF", "3nf": "3NF"}
    for step in data["steps"]:
        ws = wb.create_sheet(titles[step["id"]])
        ws["A1"] = f"Online Shop: {titles[step['id']]}"
        ws["A1"].font = Font(bold=True, size=14)
        ws["A2"] = notes[step["id"]]
        r = 4
        for t in step["tables"]:
            ws.cell(r, 1, t["name"]).font = Font(bold=True, size=12)
            r += 1
            for ci, c in enumerate(t["cols"], start=1):
                label = c["n"] + (" (PK)" if c["pk"] else "") + (" (FK)" if c["fk"] else "")
                cell = ws.cell(r, ci, label)
                cell.fill = head_fill
                cell.font = pk_font if c["pk"] else Font(bold=True, color="FFFFFF")
            for row in t["rows"]:
                r += 1
                for ci, v in enumerate(row, start=1):
                    cell = ws.cell(r, ci, "\n".join(v) if isinstance(v, list) else v)
                    cell.alignment = Alignment(wrap_text=True, vertical="top")
            r += 2
        if step.get("fds"):
            ws.cell(r, 1, "Functional dependencies").font = Font(bold=True, size=12)
            for fd in step["fds"]:
                r += 1
                ws.cell(r, 1, fd["kind"])
                ws.cell(r, 2, f"{fd['lhs']} -> {fd['rhs']}")
        for ci in range(1, 19):
            ws.column_dimensions[get_column_letter(ci)].width = 18
        if step["id"] == "unf":
            ws.column_dimensions["G"].width = 90
    wb.save(path)


def build_search_index() -> None:
    from bs4 import BeautifulSoup
    pages = [ROOT / "index.html", ROOT / "setup.html", ROOT / "assessment.html"] + sorted((ROOT / "weeks").glob("week*.html"))
    entries = []
    for p in pages:
        soup = BeautifulSoup(p.read_text(encoding="utf-8"), "html.parser")
        page_title = soup.title.get_text().split("·")[0].strip() if soup.title else p.stem
        rel = p.relative_to(ROOT).as_posix()
        for tpl in soup.find_all("template"):
            tpl.decompose()      # stepper templates duplicate visible content
        for s in soup.find_all(["script", "style"]):
            s.decompose()
        for h in soup.select("main h2[id], main h3[id]"):
            texts = []
            for sib in h.find_next_siblings():
                if sib.name in ("h2", "h3"):
                    break
                texts.append(sib.get_text(" ", strip=True))
            text = " ".join(" ".join(texts).split())[:700]
            entries.append({"page": page_title, "title": h.get_text(" ", strip=True).rstrip("#").strip(),
                            "url": f"{rel}#{h['id']}", "text": text})
    (ROOT / "assets" / "search-index.json").write_text(json.dumps(entries, ensure_ascii=False), encoding="utf-8")
    print(f"search index: {len(entries)} entries")


if __name__ == "__main__":
    subprocess.run([sys.executable, str(ROOT / "tools" / "make_normalisation_data.py")], check=True)
    build_databases()
    build_week01_downloads()
    build_week02_downloads()
    build_search_index()
    print("done")
