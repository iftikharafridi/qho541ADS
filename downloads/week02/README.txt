QHO541 Week 2: Database triggers
================================

shop_v2.db                 Online Shop with 18 triggers, 4 log tables and 1 view (open in DB Browser)
shop_v1.db                 Week 1 database with NO triggers: use it to write your own in the seminar
schema_v1.sql, seed_v1.sql Week 1 schema and data
migration_v2_triggers.sql  Everything added in Week 2: tables, triggers and the v_order_lines view
build_shop_db_v2.py        Rebuilds shop_v2.db = schema_v1 + seed_v1 + migration_v2
trigger_demo_v2.py         Lecture worked example: watch the triggers from Python (uses an in-memory copy)
seminar/w2_*.sql           Model answers for the seminar activities (run against shop_v1)

Run (Windows):   py build_shop_db_v2.py   then   py trigger_demo_v2.py
Only the Python standard library is needed.
