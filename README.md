# QHO541 Advanced Database Systems: teaching website

Interactive lecture and seminar notes for **QHO541 Advanced Database Systems** (Level 5), built around one continuous case study, the **Online Shop** database, using SQLite, Python and Tkinter.

The site is plain HTML, CSS and JavaScript: **no build step, no backend, no CDN**. It runs on GitHub Pages as-is, and offline from a laptop in a classroom.

## Status

| Part | State |
|---|---|
| Foundation: theme, navigation, search, progress, presentation mode | Done |
| Home, Setup & tools, Assessment guide | Done |
| **Week 1: Normalisation & ER diagrams** (reference lesson) | Done, reviewed and tested |
| **Week 2: Database triggers** | Done and tested |
| Weeks 3–12 | In preparation (shown as “In prep” in the navigation; no placeholder pages) |

See [`docs/progress-report.md`](docs/progress-report.md) and the file-by-file [`docs/content-audit.md`](docs/content-audit.md).

## Features

- **Lecture / Seminar / Self-check / Resources** tabs for every week, with deep links (`week01.html#seminar`, `#normal-forms`).
- **SQLite in the browser** (sql.js / WebAssembly): CodeMirror editor with SQL highlighting, Run (<kbd>Ctrl</kbd>+<kbd>Enter</kbd>, or run just the selected text), Reset, Copy and Schema. Each playground has a private copy of a controlled example database.
- **ER diagrams in Crow’s Foot (default) and Chen** from one model, with a notation toggle that switches every diagram on the page. Click an entity or relationship for a plain-English reading, its participation and the SQLite constraint that implements it. Each diagram has a **Download SVG** button for slides.
- **Interactive normalisation**: a UNF → 1NF → 2NF → 3NF → final-design stepper with redundancy highlighting, an update/insertion/deletion anomaly lab, and a functional-dependency classifier.
- **Trigger lab** (Week 2): run a statement on a private copy of `shop_v2`, see the affected rows before and after with changes highlighted, and step through the chain of triggers that fired.
- **Quizzes** with explanations; **progress tracking** (lecture, seminar, quiz ≥ 70%) shown as rings in the sidebar.
- **Presentation mode** (<kbd>P</kbd>): one lecture section per screen at projector size; <kbd>←</kbd>/<kbd>→</kbd> to move, <kbd>Esc</kbd> to exit.
- **Auto, light and dark** themes; responsive down to phone width; site search (<kbd>/</kbd>); print stylesheet.

Python and Tkinter programs are **downloaded and run locally**. The browser runs SQL only; it does not pretend to run Tkinter.

## Repository layout

```
index.html, setup.html, assessment.html     site pages
weeks/week01.html, week02.html              weekly lessons
assets/css/site.css                         design system (light/dark tokens, components)
assets/js/site.js                           shell: nav, theme, tabs, TOC, search, progress, presentation
assets/js/sql-playground.js                 in-browser SQLite playground
assets/js/erd.js, erd-models.js             ER diagram renderer (Crow's Foot + Chen) and models
assets/js/normalise.js                      normalisation stepper, anomaly lab, FD classifier
assets/js/quiz.js                           quizzes
assets/js/trigger-lab.js                    trigger lab (Week 2)
assets/vendor/                              sql.js 1.10.3, CodeMirror 5.65.16, highlight.js 11.9.0 (MIT/BSD)
assets/search-index.json                    generated search index
data/                                       databases and JSON used by the browser (generated)
downloads/week01/                           student downloads (generated)
db/                                         SOURCE: schema_v1.sql, seed_v1.sql, migration_v2_triggers.sql, scripts, seminar answers
tools/                                      build scripts
tests/                                      content tests (pytest) and browser tests (Playwright)
docs/                                       audit, progress report, screenshots
```

**Edit sources in `db/`, never the copies in `data/` or `downloads/`**, then rebuild.

## Run locally

Requires Python 3.10+ (Windows: use `py`; macOS/Linux: `python3`).

```bash
cd qho541-site
py -m http.server 8000
# open http://localhost:8000/
```

The playgrounds need `http://`; opening `index.html` by double-clicking (`file://`) shows a message explaining this.

## Rebuild generated files

After changing anything in `db/`, the normalisation data or page headings:

```bash
pip install openpyxl beautifulsoup4          # build-time only
py tools/build_all.py
```

This regenerates `data/shop_v1.db`, `data/shop_v2.db` (= v1 + `migration_v2_triggers.sql`), `data/week01_normalisation.json`, everything in `downloads/week01/` and `downloads/week02/` (including the ZIPs and the Excel walkthrough) and `assets/search-index.json`.

## Test

```bash
pip install pytest beautifulsoup4 playwright
py -m pytest -q tests/test_content.py              # 79 checks: SQL, ERD vs schema, normalisation data, triggers, scripts, links
py tests/browser_check.py                          # 74 end-to-end checks in headless Chromium + screenshots
py tests/browser_check.py --subpath qho541-notes   # the same, served from /qho541-notes/ like a GitHub Pages project site
```

`browser_check.py` needs a Chromium for Playwright (`py -m playwright install chromium`).

## Publish on GitHub Pages

**Option A: GitHub Actions (recommended).** Push the repository, then in **Settings → Pages → Build and deployment** choose **Source: GitHub Actions**. The workflow in `.github/workflows/pages.yml` runs the content tests and then publishes only the public files (pages, `assets/`, `data/`, `downloads/`).

**Option B: deploy from a branch.** Choose **Source: Deploy from a branch**, branch `main`, folder `/ (root)`. This works because there is no build step (`.nojekyll` is included). `db/`, `tools/`, `tests/` and `docs/` will also be publicly visible.

## Adding a week (Phase D)

1. Copy `weeks/week01.html` to `weeks/weekNN.html` and replace the content inside the four tab panels, keeping the `<section class="lsec">` structure (presentation mode uses it).
2. In `assets/js/site.js`, set that week’s `status` to `"ready"` in `COURSE.weeks`.
3. Add the week’s SQL and scripts to `db/`, extend `tools/build_all.py`, then rebuild and run both test suites.

## Licences

Teaching content © the module teaching team. Vendored libraries keep their own licences (see the `LICENSE` file in each `assets/vendor/*` folder).
