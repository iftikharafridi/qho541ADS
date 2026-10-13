"""
browser_check.py: end-to-end checks of the site in headless Chromium.

    python tests/browser_check.py            # needs: pip install playwright (Chromium installed)

Serves the site on http://127.0.0.1:8765, then exercises every interactive
feature on the Week 1 page, checks for JavaScript errors and horizontal
overflow on a phone-sized screen, and saves screenshots to docs/screenshots/.
Exit code 0 = all checks passed.
"""
from __future__ import annotations

import functools
import http.server
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "screenshots"
PORT = 8765
# --subpath NAME serves the site at http://127.0.0.1:PORT/NAME/ exactly like a GitHub Pages
# project site (https://user.github.io/NAME/), proving that no link assumes the site is at "/".
SUBPATH = sys.argv[sys.argv.index("--subpath") + 1].strip("/") if "--subpath" in sys.argv else ""
BASE = f"http://127.0.0.1:{PORT}/" + (SUBPATH + "/" if SUBPATH else "")
results: list[tuple[bool, str]] = []


def check(ok: bool, msg: str) -> None:
    results.append((bool(ok), msg))
    print(("PASS " if ok else "FAIL ") + msg)


def serve() -> http.server.ThreadingHTTPServer:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):   # keep the test output readable
            pass
    served = ROOT
    if SUBPATH:
        import tempfile
        tmp = Path(tempfile.mkdtemp())
        (tmp / SUBPATH).symlink_to(ROOT, target_is_directory=True)
        (tmp / "index.html").write_text("<h1>Not the site: if you see this, a link escaped the subpath</h1>")
        served = tmp
    handler = functools.partial(Quiet, directory=str(served))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def main() -> int:
    global SHOTS
    if SUBPATH:
        SHOTS = ROOT / "docs" / "screenshots" / "subpath-run"
    SHOTS.mkdir(parents=True, exist_ok=True)
    srv = serve()
    errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        def new_page(width=1440, height=900, scheme="light"):
            ctx = browser.new_context(viewport={"width": width, "height": height}, color_scheme=scheme, accept_downloads=True)
            pg = ctx.new_page()
            pg.on("console", lambda m: errors.append(f"console {m.type}: {m.text}") if m.type == "error" else None)
            pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
            return pg

        # ---------------- every page loads cleanly ----------------
        failed_requests: list[str] = []
        for name in ["index.html", "setup.html", "assessment.html", "weeks/week01.html", "weeks/week02.html"]:
            pg = new_page()
            before = len(errors)
            pg.on("response", lambda r: failed_requests.append(f"{r.status} {r.url}") if r.status >= 400 else None)
            pg.goto(BASE + name, wait_until="networkidle")
            check(pg.locator("#sidebar .nav-link").count() >= 15, f"{name}: sidebar built")
            check(len(errors) == before, f"{name}: no JavaScript errors on load")
            pg.screenshot(path=str(SHOTS / f"desktop-{name.replace('/', '-').replace('.html', '')}.png"), full_page=False)
            pg.context.close()

        check(not failed_requests, "every asset loads (no 4xx/5xx responses)" + ("" if not failed_requests else ": " + ", ".join(failed_requests[:5])))
        # every sidebar and in-page internal link stays inside the site (matters on a subpath)
        pg = new_page()
        pg.goto(BASE + "weeks/week02.html", wait_until="networkidle")
        hrefs = pg.evaluate("Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter(h => h.startsWith(location.origin))")
        outside = [h for h in hrefs if not h.startswith(BASE)]
        check(not outside, f"all {len(hrefs)} internal links stay under {BASE}" + ("" if not outside else f": {outside[:3]}"))
        pg.locator('#sidebar a[href*="week01"]').click(); pg.wait_for_load_state("networkidle")
        check(pg.url.startswith(BASE + "weeks/week01.html"), "sidebar navigation works from a lesson page")
        pg.locator('.brand').click(); pg.wait_for_load_state("networkidle")
        check(pg.url.rstrip("/").endswith("index.html") and pg.url.startswith(BASE), "logo returns to this site's home page")
        pg.context.close()

        # ---------------- Week 1 interactions ----------------
        pg = new_page()
        pg.goto(BASE + "weeks/week01.html#lecture", wait_until="networkidle")
        check(pg.locator("#panel-lecture").is_visible(), "lecture tab visible by default")

        # playground: warm-up
        warm = pg.locator(".playground").first
        warm.locator('[data-a="run"]').click()
        pg.wait_for_selector(".playground >> nth=0 >> .pg-out table")
        rows = warm.locator(".pg-out tbody tr").count()
        check(rows == 7, f"warm-up playground returns 7 rows (got {rows})")
        warm.screenshot(path=str(SHOTS / "playground.png"))

        # playground: constraints (whole script stops at first error)
        con = pg.locator('.playground[data-title="Constraints in action"]')
        con.scroll_into_view_if_needed()
        con.locator('[data-a="run"]').click()
        pg.wait_for_timeout(200)
        msg = con.locator(".pg-msg.err").inner_text()
        check("FOREIGN KEY constraint failed" in msg, "constraints playground reports the FK error")
        # select only the last statement in CodeMirror and run it
        pg.evaluate("""() => {
            const cm = document.querySelector('.playground[data-title="Constraints in action"] .CodeMirror').CodeMirror;
            const text = cm.getValue(); const start = text.indexOf('INSERT INTO orders (order_id, customer_id, order_date');
            cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(text.length));
        }""")
        con.locator('[data-a="run"]').click()
        pg.wait_for_timeout(200)
        check("1 row affected" in con.locator(".pg-out").inner_text(), "running a selected statement works (INSERT OK)")
        con.locator('[data-a="reset"]').click()
        pg.wait_for_timeout(300)
        check(con.locator(".pg-out").inner_text().strip() == "", "reset clears output")
        con.locator('[data-a="schema"]').click()
        pg.wait_for_timeout(200)
        check(con.locator(".pg-out tbody tr").count() == 39, "schema button lists all 39 columns of the 8 tables")

        # ERD toggle (all widgets switch together)
        shop = pg.locator('.erd-widget[data-model="shop"]')
        shop.scroll_into_view_if_needed()
        check(shop.locator("svg g.ent").count() == 8, "Crow's Foot shop ERD shows 8 entities")
        shop.screenshot(path=str(SHOTS / "erd-crowsfoot.png"))
        shop.locator('button[data-n="chen"]').click()
        pg.wait_for_timeout(150)
        check(shop.locator("svg g.ent").count() == 7, "Chen shop ERD shows 7 entities (ORDER_ITEM becomes CONTAINS)")
        check(shop.locator("svg polygon.chen-rel").count() >= 6, "Chen diagram draws relationship diamonds")
        n_chen = pg.locator('.erd-widget .seg button[data-n="chen"][aria-pressed="true"]').count()
        n_widgets = pg.locator(".erd-widget .seg").count()
        check(n_chen == n_widgets, f"notation toggle syncs all {n_widgets} switchable diagrams")
        shop.screenshot(path=str(SHOTS / "erd-chen.png"))
        shop.locator('g.rel[data-rel="places"] polygon').first.dispatch_event("click")
        info = shop.locator(".erd-info").inner_text()
        check("Each customer places zero or many orders" in info and "total" in info, "clicking a relationship explains cardinality and participation")
        with pg.expect_download() as dl:
            shop.locator('[data-a="svg"]').click()
        path = dl.value.path()
        svg = Path(path).read_text(encoding="utf-8")
        check(svg.startswith("<?xml") and "<svg" in svg and "CUSTOMER" in svg, "Download SVG produces a valid SVG file")
        (ROOT / "docs" / "screenshots" / "shop-chen-export.svg").write_text(svg, encoding="utf-8")
        shop.locator('button[data-n="crow"]').click()
        shop.locator('g.ent[data-ent="user_account"] rect').first.dispatch_event("click")
        check("Each user account belongs to exactly one customer" in shop.locator(".erd-info").inner_text(), "clicking an entity explains its relationships")

        # Unary relationship diagram
        un = pg.locator('.erd-widget[data-model="unary"]')
        un.scroll_into_view_if_needed()
        check(un.locator("svg polyline.rel-line").count() == 1, "unary relationship draws a self-loop in Crow's Foot")
        un.screenshot(path=str(SHOTS / "erd-unary-crow.png"))
        un.locator('button[data-n="chen"]').click()
        check(un.locator("svg polygon.chen-rel").count() == 1 and un.locator("text.rel-label").count() == 2, "unary Chen diagram shows one diamond and two roles")
        un.screenshot(path=str(SHOTS / "erd-unary-chen.png"))
        un.locator('button[data-n="crow"]').click()
        check(pg.locator('.erd-widget[data-model="shop"] polyline.rel-line.non-identifying').count() == 4, "shop ERD: 4 non-identifying (dashed) relationships")
        upg = pg.locator('.playground[data-title="Self-join: who manages whom?"]')
        upg.locator('[data-a="run"]').click(); pg.wait_for_timeout(300)
        check(upg.locator(".pg-out tbody tr").count() == 14, "self-join playground lists all 14 employees")

        # Normalisation stepper
        st = pg.locator(".stepper")
        st.scroll_into_view_if_needed()
        counts = []
        for i in range(5):
            st.locator(f'.stepper-nav button[data-i="{i}"]').click()
            counts.append(st.locator(".stepper-body .rel-table").count())
        check(counts[:4] == [1, 1, 3, 7], f"stepper shows 1/1/3/7 tables for UNF/1NF/2NF/3NF (got {counts[:4]})")
        st.locator('.stepper-nav button[data-i="1"]').click()
        band = st.locator("tr.keyband th.kb")
        check(band.count() == 1 and "composite" in band.inner_text().lower() and band.get_attribute("colspan") == "2",
              "1NF shows a 'composite primary key' band over exactly two columns")
        check("Composite primary key: (order_no, product)" in st.locator(".keyline").first.inner_text(), "1NF key line names (order_no, product)")
        dups = st.locator("td.dup").count()
        check(dups > 10, f"1NF highlights redundant copies ({dups} cells)")
        st.screenshot(path=str(SHOTS / "normalisation-1nf.png"))
        st.locator('[data-a="dup"]').uncheck()
        check(st.locator("td.dup").count() == 0, "redundancy highlighting can be turned off")
        st.locator('[data-a="dup"]').check()

        # Anomaly lab
        an = pg.locator(".anomaly")
        an.scroll_into_view_if_needed()
        an.locator('[data-a="update"]').click()
        check(an.locator("td.changed").count() == 1 and an.locator("td.conflict").count() == 3, "update anomaly: 1 changed, 3 conflicting cells")
        an.screenshot(path=str(SHOTS / "anomaly-update.png"))
        an.locator('[data-a="insert"]').click()
        check(an.locator("td.conflict").count() == 1 and "NULL" in an.inner_text(), "insertion anomaly shows a NULL key")
        an.locator('[data-a="delete"]').click()
        check(an.locator("tr.deleted").count() == 2, "deletion anomaly strikes order 1003's two rows")

        # FD classifier
        items = pg.locator(".classify-item")
        for i in range(items.count()):
            it = items.nth(i)
            it.locator(f'.opts button[data-v="{it.get_attribute("data-answer")}"]').click()
        check(pg.locator(".classify-item.answered.ok").count() == items.count(), "dependency classifier marks correct answers")

        # Presentation mode
        pg.locator("#overview").scroll_into_view_if_needed()
        pg.keyboard.press("p")
        pg.wait_for_timeout(200)
        visible = pg.evaluate("Array.from(document.querySelectorAll('#panel-lecture .lsec')).filter(s => s.offsetParent !== null).length")
        check(pg.evaluate("document.body.classList.contains('presenting')") and visible == 1, "presentation mode shows one section at a time")
        pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(150)
        check(pg.locator(".present-bar .count").inner_text().startswith("2 /"), "arrow key advances to the next section")
        pg.screenshot(path=str(SHOTS / "presentation-mode.png"))
        geo = pg.evaluate("""() => { const m = document.querySelector('.main').getBoundingClientRect();
            const b = document.querySelector('.present-bar').getBoundingClientRect(); return [m.bottom, b.top]; }""")
        check(geo[0] <= geo[1] + 1, f"presentation bar sits below the content area, not over it ({geo})")
        # go to the normalisation section and check it is readable on a projector-sized screen
        for _ in range(6):
            pg.keyboard.press("ArrowRight")
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(SHOTS / "presentation-normalisation.png"))
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(150)
        check(not pg.evaluate("document.body.classList.contains('presenting')"), "Esc leaves presentation mode")

        # Lecture completion
        pg.locator('.complete-bar[data-part="lecture"] button').click()
        check(pg.locator('#tab-lecture .dot.done').count() == 1, "marking the lecture complete updates the tab indicator")

        # Seminar: model-answer playground loaded from .sql file
        pg.locator("#tab-seminar").click()
        check(pg.locator("#panel-seminar").is_visible(), "seminar tab opens")
        det = pg.locator("#fruit-shop ~ details.answer").first
        det.locator("summary").click()
        fpg = det.locator(".playground")
        fpg.locator('[data-a="run"]').click()
        pg.wait_for_timeout(300)
        check(fpg.locator(".pg-out tbody tr").count() == 12, "fruit-shop model answer: JOIN rebuilds 12 sale lines")
        check(det.locator("svg g.ent").count() == 5, "fruit-shop model ERD renders")

        # Quiz
        pg.locator("#tab-selfcheck").click()
        quiz = pg.locator(".quiz")
        import json
        data = pg.evaluate("document.querySelector('.quiz').__q.qs")
        for q in data:
            quiz.locator(f'.quiz-opts button[data-k="{q["answer"]}"]').click()
            quiz.locator(".quiz-nav .btn").click()
        check(f"{len(data)} / {len(data)}" in quiz.inner_text(), f"quiz scores {len(data)}/{len(data)} with the correct answers")
        check(pg.locator('#tab-selfcheck .dot.done').count() == 1, "passing the quiz marks it complete")
        ring = pg.locator('#sidebar a[href*="week01"] .nav-num svg.ring').count()
        check(ring == 1, "sidebar shows a progress ring for Week 1")

        # Search
        pg.locator("#search-input").fill("transitive dependency")
        pg.wait_for_selector("#search-results.open a")
        n = pg.locator("#search-results a").count()
        check(n >= 1, f"search finds results ({n})")
        pg.locator("#search-results a").first.click()
        pg.wait_for_timeout(300)
        check("#" in pg.url, "search result navigates to a section")

        # Theme
        pg.locator("#theme-btn").click()   # auto -> light
        pg.locator("#theme-btn").click()   # light -> dark
        check(pg.evaluate("document.documentElement.getAttribute('data-theme')") == "dark", "theme button switches to dark")
        pg.locator("#tab-lecture").click()
        pg.locator("#shop-erd").scroll_into_view_if_needed()
        pg.wait_for_timeout(150)
        pg.screenshot(path=str(SHOTS / "dark-erd.png"))
        pg.context.close()

        # dark mode from the OS preference
        pg = new_page(scheme="dark")
        pg.goto(BASE + "weeks/week01.html", wait_until="networkidle")
        check(pg.evaluate("document.documentElement.getAttribute('data-theme')") == "dark", "auto theme follows the OS dark preference")
        pg.context.close()

        # ---------------- Week 2 interactions ----------------
        pg = new_page()
        pg.goto(BASE + "weeks/week02.html#lecture", wait_until="networkidle")
        lab = pg.locator(".trigger-lab")
        lab.scroll_into_view_if_needed()
        pg.wait_for_function("document.querySelector('.trigger-lab .tl-status').textContent.indexOf('Run statement') >= 0")
        scenarios = pg.evaluate("document.querySelector('.trigger-lab').__tl.sc")
        ok_all = True
        for i, sc in enumerate(scenarios):
            lab.locator("select").select_option(str(i))
            lab.locator('[data-a="run"]').click()
            pg.wait_for_timeout(150)
            status = lab.locator(".tl-status").inner_text()
            good = ("refused" in status) == (sc["expect"] == "error")
            changed = lab.locator("td.changed, tr.tl-new").count()
            if sc["expect"] == "ok" and changed == 0:
                good = False
            if not good:
                ok_all = False
                print("   scenario problem:", sc["title"], "|", status)
            if i == 1:
                pg.wait_for_timeout(1500)
                lab.screenshot(path=str(SHOTS / "trigger-lab-cascade.png"))
        check(ok_all, f"trigger lab: all {len(scenarios)} scenarios run with the expected success/refusal and visible changes")
        lab.locator('[data-a="reset"]').click(); pg.wait_for_timeout(300)
        check("reset" in lab.locator(".tl-status").inner_text().lower(), "trigger lab reset reloads the database")
        v2 = pg.locator('.erd-widget[data-model="shop_v2_logs"]')
        v2.scroll_into_view_if_needed()
        check(v2.locator("svg g.ent").count() == 6, "Week 2 ERD of the trigger-maintained tables renders")
        p4 = pg.locator('.playground[data-title="Step 4: refuse the order with a clear message"]')
        p4.scroll_into_view_if_needed(); p4.locator('[data-a="run"]').click(); pg.wait_for_timeout(300)
        check("Not enough stock" in p4.locator(".pg-msg.err").inner_text(), "Step 4 playground shows the trigger's RAISE message")
        p5 = pg.locator('.playground[data-title="A foreign-key cascade fires DELETE triggers"]')
        p5.scroll_into_view_if_needed(); p5.locator('[data-a="run"]').click(); pg.wait_for_timeout(300)
        txt = p5.locator(".pg-out").inner_text()
        check("175" in txt and "180" in txt, "cascade playground: stock 180 → 175 → 180")
        pg.locator("#timing").scroll_into_view_if_needed(); pg.wait_for_timeout(100)
        pg.screenshot(path=str(SHOTS / "week02-flow.png"))
        pg.locator("#tab-seminar").click()
        det = pg.locator("#guided-stock ~ details.answer").first
        det.locator("summary").click()
        mp = det.locator(".playground"); mp.locator('[data-a="run"]').click(); pg.wait_for_timeout(400)
        check("70" in mp.locator(".pg-out").inner_text(), "seminar model answer loads from its .sql file and runs")
        pg.locator("#tab-selfcheck").click()
        quiz = pg.locator(".quiz")
        data = pg.evaluate("document.querySelector('.quiz').__q.qs")
        for q in data:
            quiz.locator(f'.quiz-opts button[data-k="{q["answer"]}"]').click()
            quiz.locator(".quiz-nav .btn").click()
        check(f"{len(data)} / {len(data)}" in quiz.inner_text(), f"Week 2 quiz scores {len(data)}/{len(data)}")
        pg.locator("#tab-lecture").click()
        pg.locator("#trigger-lab").scroll_into_view_if_needed()
        pg.keyboard.press("p"); pg.wait_for_timeout(200)
        check(pg.evaluate("document.body.classList.contains('presenting')"), "Week 2 presentation mode starts")
        pg.screenshot(path=str(SHOTS / "week02-present-lab.png"))
        pg.keyboard.press("Escape")
        pg.locator("#search-input").fill("RAISE IGNORE")
        pg.wait_for_selector("#search-results.open a")
        check(any("Week 2" in t for t in pg.locator("#search-results .sr-page").all_inner_texts()), "search finds Week 2 content")
        pg.context.close()

        # ---------------- every downloadable SQL script also runs in the browser's SQLite (sql.js) ----------------
        pg = new_page()
        pg.goto(BASE + "weeks/week02.html", wait_until="networkidle")
        res = pg.evaluate("""async () => {
            const get = p => fetch('../downloads/' + p).then(r => r.text());
            const out = {};
            const SQL = await QHO541.sql.load();
            const probe = new SQL.Database(); out.version = probe.exec("SELECT sqlite_version()")[0].values[0][0]; probe.close();
            const v2 = (await get('week02/schema_v1.sql')) + (await get('week02/seed_v1.sql')) + (await get('week02/migration_v2_triggers.sql'));
            let db = await QHO541.sql.openDb('empty', v2);
            out.triggers = db.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'")[0].values[0][0];
            out.fk = db.exec("PRAGMA foreign_key_check").length; db.close();
            const files = ['week01/seminar/fruit_shop_3nf.sql','week01/seminar/car_service_3nf.sql','week01/seminar/student_enrolment_3nf.sql','week01/unary_emp.sql'];
            out.ok = [];
            for (const f of files) { const d = await QHO541.sql.openDb('empty', await get(f)); out.ok.push(f); d.close(); }
            for (const f of ['w2_stock_triggers.sql','w2_order_totals.sql','w2_restock.sql','w2_debugging_fixed.sql']) {
                const d = await QHO541.sql.openDb('shop_v1', await get('week02/seminar/' + f)); out.ok.push(f); d.close(); }
            return out; }""")
        print(f"   sql.js SQLite version: {res['version']}")
        check(res["triggers"] == 18 and res["fk"] == 0 and len(res["ok"]) == 8,
              f"all downloadable SQL scripts run in the browser's SQLite {res['version']} (schema+seed+migration, 8 seminar/example files)")
        pg.context.close()

        # ---------------- mobile ----------------
        for name in ["index.html", "weeks/week01.html", "weeks/week02.html", "assessment.html"]:
            pg = new_page(390, 844)
            pg.goto(BASE + name, wait_until="networkidle")
            overflow = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
            check(overflow <= 1, f"{name} on phone: no horizontal page scroll (overflow {overflow}px)")
            pg.screenshot(path=str(SHOTS / f"mobile-{name.replace('/', '-').replace('.html', '')}.png"))
            if "week01" in name:
                st = pg.locator(".stepper"); st.scroll_into_view_if_needed()
                st.locator('.stepper-nav button[data-i="1"]').click(); pg.wait_for_timeout(300)
                wrap = st.locator(".table-wrap").first
                check("scroll-x" in (wrap.get_attribute("class") or ""), "phone: wide 1NF table is marked scrollable with a hint")
                wrap.evaluate("w => w.scrollLeft = 400"); pg.wait_for_timeout(100)
                left = pg.evaluate("() => { const w=document.querySelector('.stepper .table-wrap'); const c=w.querySelector('tbody td'); return c.getBoundingClientRect().left - w.getBoundingClientRect().left; }")
                check(abs(left) <= 2, f"phone: key column stays pinned while scrolling sideways (offset {left:.0f}px)")
                st.screenshot(path=str(SHOTS / "mobile-1nf-scrolled.png"))
                pg.locator("#menu-btn").click()
                pg.wait_for_timeout(250)
                check(pg.locator("#sidebar").bounding_box()["x"] >= -1, "phone: menu button opens the sidebar")
                pg.screenshot(path=str(SHOTS / "mobile-menu.png"))
            pg.context.close()

        # file:// gives a helpful message rather than a silent failure
        pg = new_page()
        pg.goto((ROOT / "weeks" / "week01.html").as_uri())
        pg.wait_for_timeout(800)
        check("web server" in pg.locator(".playground").first.inner_text(), "file:// shows a 'use a web server' hint")
        pg.context.close()
        browser.close()
    srv.shutdown()

    real_errors = [e for e in errors if "file://" not in e and "Failed to fetch" not in e and "ERR_FILE" not in e and "CORS" not in e]
    check(not real_errors, "no JavaScript errors over the whole run" + ("" if not real_errors else ":\n  " + "\n  ".join(real_errors)))
    failed = [m for ok, m in results if not ok]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
