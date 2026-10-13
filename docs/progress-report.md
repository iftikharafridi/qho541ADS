# Implementation progress report: Week 1 review and Week 2

Date: 13 October 2026 · Scope: corrections and verification of Week 1 (your review points 1–4), then Week 2 (Database triggers). Week 3 has **not** been started and is waiting for review.

## 1. Week 1: academic corrections

| Review point | What was done |
|---|---|
| 1NF composite key | Key columns moved to the front of the 1NF table. An orange **“composite primary key” band** spans exactly `order_no` + `product`, the table title reads *Composite primary key: (order_no, product)*, and the text explains why neither column is a key alone, with the assumption “a product appears at most once per order”. |
| Functional dependencies and UNF→3NF progression | Each transitive dependency now shows its chain (e.g. *chain: key → order_no → email*), and the text explains why `first_name` is both partially and transitively dependent, so it moves first in 2NF and again in 3NF. |
| Data really demonstrates the claims | New tests check that every listed dependency holds in the sample data and that each claimed redundancy actually repeats. They also check every anomaly statement (Jane on 4 rows; Fizz & Co phone on 3; deleting order 1003 loses Andy, Olive Oil and Home Foods; Garden Peas never ordered) and that 2NF and 3NF join back to exactly the 1NF rows. |
| INVENTORY as a weak entity | New subsection covering: double rectangle, identifying double diamond, total participation, why there is no partial key (1:1), and that treating stock as attributes of PRODUCT is a defensible alternative. |
| Chen → Crow’s Foot mapping | New subsection with a mapping table (entity, 1:N, 1:1, **M:N CONTAINS → ORDER_ITEM**, weak entity, foreign keys) and an explanation of how the minimum and maximum cardinalities move onto the two new 1:N lines. |
| Cardinalities, PKs and FKs vs schema | Crow’s Foot now uses **solid lines for identifying and dashed lines for non-identifying** relationships (Coronel & Morris / MySQL Workbench convention), shown in the legend. Tests check every model against the real SQLite schema: columns, types, PK/FK/UNIQUE flags, NOT NULL on mandatory parents, UNIQUE on 1:1 ends, and identifying ⇔ the FK being part of the child’s PK. |
| Missing topic found | **Unary (recursive) relationships**: added with both notations, a self-join playground and `unary_emp.sql`, using the EMP table from the original `Database.db`. Two new quiz questions on the composite key and on the M:N mapping. |

## 2. Week 1: presentation and usability

- **Mobile tables:** wide tables get edge shadows and a “Scroll sideways for more columns →” hint, and key columns stay **pinned** while scrolling (tested: 0 px drift at 390 px width).
- **Presentation mode:** the navigation bar is now a strip **below** the content area, so it never covers it (tested geometrically). Normalisation tables, key labels and dependency lists are enlarged for projection.
- Light, dark and auto themes and the ERD notation toggle are kept.
- A layout bug found in testing was fixed: code in the two-column layout could widen the page on phones.

## 3. Week 2: Database triggers (new)

- **Database `shop_v2`** = v1 + `migration_v2_triggers.sql`: 4 supporting tables (stock_movement, price_history, reorder_alert, audit_log), the view `v_order_lines` and **18 triggers** covering INSERT/UPDATE/DELETE with BEFORE/AFTER/INSTEAD OF timing.
  - The triggers enforce: stock checks and reservation, amendments, returns, locking of shipped orders, a status workflow, cancellation restock, only-Pending deletion, cascading reorder alerts, price and customer audit, and inserting by product name through a view.
- **Lecture, 14 sections:**
  - **Foundations:** motivation and real-world uses; event → condition → action; benefits and drawbacks; syntax; managing triggers; OLD and NEW.
  - **Execution:** a flow diagram of BEFORE / constraints / AFTER / cascade / RAISE; the stock trigger rebuilt step by step from the original slides (fixed-99 attempt, NEW, CHECK as defence in depth, Solutions 1 and 2, IIF, the NULL trap); WHEN rules; the four RAISE modes.
  - **The shop’s triggers:** the catalogue of all 18; a status-workflow diagram; audit logging (including UK GDPR and the lack of a current user in SQLite); cascading, recursion and firing order; INSTEAD OF.
  - **Beyond SQLite:** comparison with MySQL, PostgreSQL, SQL Server and Oracle; Python error handling; debugging and common mistakes.
- **Trigger lab:** 9 scenarios that run for real in the browser, with before/after tables, highlighted changes and a step-by-step firing chain.
- **Seminar:** prediction exercise; guided INSERT triggers; UPDATE/DELETE (the original extra task); order totals (the original Task 1, with a denormalisation discussion); restock via a movement log; a debugging clinic built on the original slide bug; own-project trigger planning (no solutions); 5 independent tasks.
- **Self-check and resources:** a 12-question quiz, exit ticket and checklist; 10 downloads including `trigger_demo_v2.py`, and 4 model answers.
- Every claim about SQLite behaviour was **verified by experiment** before being written, including:
  - foreign-key cascades fire triggers;
  - `NEW` cannot be assigned;
  - `NEW` in a DELETE trigger fails only at run time;
  - `RAISE` messages must be string literals;
  - ABORT/FAIL/ROLLBACK/IGNORE semantics;
  - `UPDATE OF` fires on unchanged values;
  - newest-first (undocumented) firing order.

## 4. Testing performed

| Suite | Command | Result |
|---|---|---|
| Content | `py -m pytest -q tests/test_content.py` | **79 passed** |
| Browser, site at `/` | `py tests/browser_check.py` | **74 passed** |
| Browser, GitHub Pages subpath | `py tests/browser_check.py --subpath qho541-notes` | **74 passed**: no 4xx/5xx, all 90 internal links stay under the subpath, sidebar and logo navigation correct |

The content tests also cover:
- every SQL example and every playground’s default SQL, including the deliberately failing ones;
- downloads byte-identical to their sources;
- all 9 trigger-lab scenarios, replayed in Python: refused statements must change nothing, successful ones must change something, and every trigger named must exist;
- the business rules of `shop_v2`;
- the Week 1 and Week 2 scripts, run from a different folder. The **printed expected output on the Week 2 page is compared character-for-character with the real output**, and the demo leaves the database file unchanged.

The browser suite also runs:
- every downloadable SQL script inside the browser’s own SQLite (sql.js, SQLite 3.45.2);
- playgrounds (load, run, run-selection, reset, schema);
- the ERD toggle and explanations, SVG export, stepper, anomaly lab, classifier, trigger lab and its reset;
- quizzes, search, theme, OS dark mode and presentation mode;
- phone layout for every page, and the `file://` warning.

The assessment page’s 23 key facts (dates, percentages, minimums, word limits, penalties, AI rule) were cross-checked against the text of the October 2026 brief: all match. The brief itself is not published in the repository.

## 5. Checks not performed (not marked as passed)

- **Windows:** scripts use `pathlib` and the standard library only, but have not been run on a Windows machine.
- **Firefox and Safari:** automated tests ran in Chromium only.
- **Tkinter:** neither week contains GUI code yet, so no GUI testing was applicable.
- **Live GitHub Pages:** the subpath behaviour was reproduced locally. The repository has not been pushed, so the Actions workflow has not run on GitHub.
- **Screen readers:** the site uses semantic HTML, ARIA tabs and alt text, but has not been tested with NVDA or VoiceOver.

## 6. Outstanding points for your decision

1. **Employee and accounting data** (raised in the last report, still open): the brief’s scenario mentions employees and accounting. Week 2 did not add them to the shop, to keep its focus on triggers. A payment table would fit naturally in Week 3 (views and functions over payments) if you want it.
2. **Module specification:** still not supplied, so the sequence is checked against the brief only.
3. **The order triggers reserve stock** when an item is added to a Pending order. This is a common e-commerce model and is explained on the page. If you prefer stock to fall only at *Paid*, the triggers can be changed before Week 3 builds on them.
