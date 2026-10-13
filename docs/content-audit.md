# Content migration and audit checklist

Every file in the original `QHO541_Advanced_Database_Systems.zip` (73 files), where its content goes in the new site, its status and the problems found.
Nothing is silently discarded: duplicates and non-module files are listed with a reason.

**Status summary:** Corrected: 2 · Duplicate: 5 · Excluded (not module content): 5 · Excluded (size): 1 · Migrated: 8 · Partly migrated: 2 · Scheduled W10: 6 · Scheduled W11: 8 · Scheduled W12: 5 · Scheduled W3: 4 · Scheduled W4: 5 · Scheduled W5: 2 · Scheduled W6: 3 · Scheduled W7: 4 · Scheduled W8: 3 · Scheduled W9: 8 · Superseded: 2

Status key: **Migrated** = in the site now · **Partly migrated** = used in Week 1, rest later · **Scheduled Wn** = source for that week (Phase D) · **Corrected** = superseded by the authoritative brief · **Duplicate / Superseded / Excluded** = not republished, reason given.

| # | Original file | New location | Status | Issues found / action |
|---|---|---|---|---|
| 1 | `Assessment/Assessment_Brief_QHO541_OCTOBER2026.docx` | Assessment guide (authoritative source) | Migrated | Learning Outcomes and Living CV sections are blank; 'SQLite Server'/'SQL Server' wording; Part 3 GUI item has no marks. Flagged on the page. |
| 2 | `Week-01 Data Normalisation/Data - Relational Database - DB Normalization.pptx` | Week 1 · Lecture (data & information, relational vs NoSQL, keys, SQL sub-languages, normal forms); Seminar Activity 1; Beyond 3NF | Migrated | Image-only slides 3–19 and 28–33 reviewed; every topic (DIKW, flat file, Codd 1970, keys & why-not-a-name, track/artist and vehicle/owner cardinality, DDL/DML/DQL/DCL/TCL) rewritten as text, tables and SVG. Movie-rental 1NF–3NF example replaced by the Online Shop walkthrough. NoSQL errors corrected (Cassandra = wide-column; HBase ≠ Vertica; documents ≠ BLOBs). 'COM 519' → QHO541. |
| 3 | `Week-01 Data Normalisation/Database.db` | Reviewed; superseded by shop_v1.db | Superseded | Oracle-style demo schema (emp/dept/ord/item). Not used; the Online Shop is the single case study. |
| 4 | `Week-01 Data Normalisation/Example Normalisation Flat File - 3NF.xlsx` | Week 1 · normalisation stepper (order number/status/date columns) | Migrated | Order cost values were inconsistent with prices; replaced by derived totals (not stored). |
| 5 | `Week-01 Data Normalisation/Flat file NF1 to NF3 Example.xlsx` | Week 1 · normalisation stepper, anomaly lab, walkthrough workbook | Migrated | Original 2NF example lost the order–product link (lossy); 'product quantity' conflated ordered vs stock; spelling fixed. Rebuilt from one JSON source; lossless join verified by tests. |
| 6 | `Week-01 Data Normalisation/SQL Query Optimizations.pptx` | Week 3 (views, functions & optimisation) | Scheduled W3 | Rewrite for SQLite: T-SQL DECLARE/WHILE loops are not SQLite; use EXPLAIN QUERY PLAN; Python loop vs executemany. |
| 7 | `Week-01 Data Normalisation/WEEK 2 extra tasks NF/Normalization Forms (3).pptx` | Week 1 · Seminar Activity 2 (fruit shop) + model answer | Migrated | Data shows a single stock level per product; model answer reflects this. Phone shared by 4 customers used as a teaching point. |
| 8 | `Week-01 Data Normalisation/WEEK 2 extra tasks NF/Normalization Forms extra tasks (2).pptx` | Week 1 · Seminar Activity 3 (car service) + Challenge (student enrolment) | Migrated | Data gaps (James's two cars, Roman's missing charge, 'COM 67' vs 'COM67') turned into explicit assumption exercises. |
| 9 | `Week-02 Database Triggers/SQL Query Optimizations.pptx` | Week 3 | Duplicate | Byte-identical to the Week 1 copy. |
| 10 | `Week-02 Database Triggers/W02_Advanced Database QHO541.pptx` | Week 2 · Lecture (what/why, syntax, OLD/NEW, first trigger, step-by-step stock trigger, IIF, Solutions 1–2) and Seminar Activities 4 & 7 | Migrated | Fixed-99 trigger kept as a deliberate 'wrong first attempt' and debugging exercise; curly quotes and double-quoted strings removed; NULL trap (COALESCE) added; 'COM 519' → QHO541. |
| 11 | `Week-02 Database Triggers/Week 2 Extra tasks Triggers .pptx` | Week 2 · Seminar Activity 3 (UPDATE and DELETE stock triggers) | Migrated |  |
| 12 | `Week-02 Database Triggers/db11` | Superseded by shop_v2.db | Duplicate | Identical to Week-04/db11. |
| 13 | `Week-02 Database Triggers/ex1` | Superseded by shop_v1.db / shop_v2.db | Superseded | Tables lacked PK/FK constraints; trigger hard-coded a value. |
| 14 | `Week-03 SQL Views/W04_Advanced Database QHO541.pptx` | Week 3 (views) | Scheduled W3 | File misnamed W04. Curly quote in 'Sales’' example. |
| 15 | `Week-03 SQL Views/Week 3 SQL VIEW Extra task .pptx` | Week 3 · Seminar | Scheduled W3 |  |
| 16 | `Week-04 Tkinter GUI Development/Example OOP .zip` | Week 5 | Scheduled W5 | Remove __pycache__ from the published version. |
| 17 | `Week-04 Tkinter GUI Development/Functions.docx` | Week 3 (built-in functions) | Scheduled W3 | Uses SQL Server functions GETDATE/ISDATE/MONTH/ISNUMERIC that do not exist in SQLite; rewrite with date(), strftime(), typeof(), julianday(). |
| 18 | `Week-04 Tkinter GUI Development/P_ex1.py` | Week 4 | Scheduled W4 | String-concatenated SQL; relative 'db1' path. |
| 19 | `Week-04 Tkinter GUI Development/Python_button_using_loop and colour.py` | Week 4 · widget gallery | Scheduled W4 |  |
| 20 | `Week-04 Tkinter GUI Development/RadioButtons Tkinter get values examples-20251204.zip` | Week 4 · widget gallery | Scheduled W4 | Contains two .docx code examples. |
| 21 | `Week-04 Tkinter GUI Development/W04_Advanced Database QHO541 - OOP.pptx` | Week 5 (OOP GUI design) | Scheduled W5 | Refers to 'SOL week 6'; typo 'alue_password.encode()'. |
| 22 | `Week-04 Tkinter GUI Development/W04_Advanced DatabaseQHO541.pptx` | Week 4 (Tkinter & CRUD) | Scheduled W4 | Login code concatenates SQL strings → show as vulnerable version, then parameterised; link to Week 10. |
| 23 | `Week-04 Tkinter GUI Development/db11` | Week 4/5 example DB | Scheduled W4 | No constraints; replaced by shop_v4.db. |
| 24 | `Week-06 Cryptography/Caesar wheel Function in Python.docx` | Week 6 | Scheduled W6 | Bug: finalLetter undefined for non-letters; uppercase wrap wrong; add decrypt. |
| 25 | `Week-06 Cryptography/Example encrypt data.zip` | Week 6 | Scheduled W6 | Remove .idea and __pycache__; contains an empty db11.db. |
| 26 | `Week-06 Cryptography/W05_Advanced Database QHO541.pptx` | Week 6 (validation & cryptography) | Scheduled W6 | Deck named W05 in a Week-06 folder. SHA1()/SHA224() are not built into SQLite; use hashlib. Teach salted PBKDF2 for passwords + Fernet for reversible encryption. |
| 27 | `Week-06 XML and Data Integration/Example - Python_XML_RW_and _logoin- Sqlite.zip` | Week 7 | Scheduled W7 | Nested zip inside zip. |
| 28 | `Week-06 XML and Data Integration/W06_Advanced Database QHO541.pptx` | Week 7 (XML) | Scheduled W7 | XML 'doesn't support arrays' claim to be nuanced. |
| 29 | `Week-06 XML and Data Integration/Week 6 NoSQL (1).pptx` | Week 1 (relational recap, ERD reading) and Week 7 (NoSQL context) | Partly migrated | Slides labelled 'Week-1 Topics'. ERD/relational recap used in Week 1. |
| 30 | `Week-06 XML and Data Integration/XML induced Login App.docx` | Week 7 | Scheduled W7 | Remove pasted AI-chat text ('Do you want me to also prepare…'), given the brief's AI rules. Code itself is sound (parameterised, hashed). |
| 31 | `Week-07 XML (Continued)/Example - Python_XML_RW_and_login-sqlite-20261013.zip` | Week 7 · Seminar (contains 'Week7 - Tasks.pptx') | Scheduled W7 |  |
| 32 | `Week-07 XML (Continued)/W06_Advanced Database QHO541.pptx` | Week 7 | Duplicate | Identical to Week-06 copy. |
| 33 | `Week-07 XML (Continued)/Week 6 NoSQL (1).pptx` | Week 7 | Duplicate | Identical to Week-06 copy. |
| 34 | `Week-08 Data Visualization/W08_Advanced Database QHO541.pptx` | Week 8 | Scheduled W8 |  |
| 35 | `Week-08 Data Visualization/db1` | Not published | Excluded (size) | 75 MB of audio BLOBs; replace with a small seed DB. |
| 36 | `Week-08 Data Visualization/example_frames.py` | Week 8 | Scheduled W8 |  |
| 37 | `Week-08 Data Visualization/python_canvas.py` | Week 8 | Scheduled W8 | Hard-codes coordinates; generalise to scale to data. |
| 38 | `Week-09 BLOB and Multimedia Data/Browse the Files.py` | Week 9 | Scheduled W9 |  |
| 39 | `Week-09 BLOB and Multimedia Data/Label and Image.py` | Week 9 | Scheduled W9 |  |
| 40 | `Week-09 BLOB and Multimedia Data/Label and Image1.py` | Week 9 | Scheduled W9 |  |
| 41 | `Week-09 BLOB and Multimedia Data/P_ex1_SQL injection.py` | Week 10 | Duplicate | Identical to the Week-10 copy. |
| 42 | `Week-09 BLOB and Multimedia Data/P_sql_media_file.py` | Week 9 | Scheduled W9 |  |
| 43 | `Week-09 BLOB and Multimedia Data/Python List TK.py` | Week 9 | Scheduled W9 |  |
| 44 | `Week-09 BLOB and Multimedia Data/W09_Advanced Database QHO541.pptx` | Week 9 | Scheduled W9 | Repeats Week 8 slides; refers to 'WEEK 10'. Hard-coded C:\Users\petrosyana path. |
| 45 | `Week-09 BLOB and Multimedia Data/db1` | Week 9 | Scheduled W9 |  |
| 46 | `Week-09 BLOB and Multimedia Data/examples images and media files.zip` | Week 9 | Scheduled W9 |  |
| 47 | `Week-10 SQL Injection and Security/Engageli Promo for existing Solent students.pptx` | Not published | Excluded (not module content) | Platform announcement for Solent students. |
| 48 | `Week-10 SQL Injection and Security/Example of GIF files to use with BLOB and DB-20260205.zip` | Week 9/10 | Scheduled W10 |  |
| 49 | `Week-10 SQL Injection and Security/Label and Image1.py` | Week 9/10 | Scheduled W10 |  |
| 50 | `Week-10 SQL Injection and Security/P_ex1_SQL injection.py` | Week 9/10 | Scheduled W10 |  |
| 51 | `Week-10 SQL Injection and Security/SQLi.pptx` | Week 10 | Scheduled W10 | PortSwigger labs; add SQLite equivalents (sqlite_master, pragma_table_info). |
| 52 | `Week-10 SQL Injection and Security/W10_Advanced Database QHO541.pptx` | Week 10 | Scheduled W10 | Title says 'WEEK 11'. Defence should be parameterised queries, not only IF checks. |
| 53 | `Week-10 SQL Injection and Security/db1` | Week 9/10 | Scheduled W10 |  |
| 54 | `Week-11 Parallel Database Queries/Engageli Promo for existing Solent students (1).pptx` | Not published | Excluded (not module content) | Three copies (two identical). |
| 55 | `Week-11 Parallel Database Queries/Engageli Promo for existing Solent students (2).pptx` | Not published | Excluded (not module content) | Three copies (two identical). |
| 56 | `Week-11 Parallel Database Queries/Engageli Promo for existing Solent students.pptx` | Not published | Excluded (not module content) | Three copies (two identical). |
| 57 | `Week-11 Parallel Database Queries/Parallel.py` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 58 | `Week-11 Parallel Database Queries/ParallelDUR.py` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 59 | `Week-11 Parallel Database Queries/Student.py` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 60 | `Week-11 Parallel Database Queries/StudentNoThread.py` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 61 | `Week-11 Parallel Database Queries/WEEK11_Scenario.pptx` | Week 12 (scenario & requirements) | Scheduled W12 |  |
| 62 | `Week-11 Parallel Database Queries/db1.db` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 63 | `Week-11 Parallel Database Queries/loginScript.py` | Week 11/12 integration example | Scheduled W11 | Hard-coded C:\Users\Admin\Downloads\db1.db path. |
| 64 | `Week-11 Parallel Database Queries/testing.py` | Week 11 (pytest) | Scheduled W11 | Hard-coded C:\Users\Admin path; tests reference undefined names. |
| 65 | `Week-11 Parallel Database Queries/week11.db` | Week 11 (concurrency) | Scheduled W11 | No lecture deck exists for this topic: new notes needed (locking, WAL, one connection per thread, transactions). |
| 66 | `Week-12 Assessment Support/Access variables between classes.py` | Week 5 / Week 12 | Scheduled W12 |  |
| 67 | `Week-12 Assessment Support/Engageli Promo for existing Solent students.pptx` | Not published | Excluded (not module content) |  |
| 68 | `Week-12 Assessment Support/Example2 Access variables between classes.py` | Week 5 / Week 12 | Scheduled W12 |  |
| 69 | `Week-12 Assessment Support/Testing.pptx` | Assessment guide · Testing guidance; Week 11 | Partly migrated | Test-plan table and test types used on the assessment page. |
| 70 | `Week-12 Assessment Support/Timeline example.xlsx` | Week 12 | Scheduled W12 | Dates from 2024; update. |
| 71 | `Week-12 Assessment Support/W012_Assessment Brief Advanced Database.pptx` | Assessment guide + Week 12 | Corrected | Conflicts with Oct 2026 brief: Part 2/3 = 35/35 (brief 45/25); min 2 views/triggers (brief 3/3); 'not all tables need 5 records' (brief: each ≥5); 'encryption or decryption' (brief: and). |
| 72 | `Week-12 Assessment Support/WEEK_12.pptx` | Week 12 | Corrected | Stale deadline '4th February 2025' (brief: 29 Jan 2027, 4pm). |
| 73 | `Week-12 Assessment Support/selected button name EXAMPLE.docx` | Week 5 / Week 12 | Scheduled W12 |  |

## Cross-cutting corrections applied site-wide

- Learning objectives citing **COM 519** → QHO541.
- Week numbering made consistent (decks were named W04/W05/W06 in other weeks' folders and referred to SOL week numbers from a previous year).
- Curly quotes and double-quoted string literals removed from all SQL so code can be copied and run.
- Hard-coded Windows paths replaced with `Path(__file__).resolve().parent` (enforced by an automated test).
- Every SQL example is executed against the database it targets by `tests/test_content.py`.
- ER diagrams are checked against the real SQLite schema (columns, PK, FK, UNIQUE, 1:1 uniqueness, NOT NULL for mandatory parents).
