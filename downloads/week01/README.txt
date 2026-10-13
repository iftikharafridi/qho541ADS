QHO541 Week 1: Normalisation and ER diagrams
============================================

shop_v1.db                 Ready-made Online Shop database (open in DB Browser for SQLite)
schema_v1.sql              CREATE TABLE statements (3NF schema with constraints)
seed_v1.sql                Sample data (every table has 5+ rows)
build_shop_db.py           Rebuilds shop_v1.db from the two .sql files
explore_shop_v1.py         Lecture worked example: JOINs, parameterised queries, constraints
week01_normalisation_walkthrough.xlsx   UNF -> 1NF -> 2NF -> 3NF worked example
unary_emp.sql              Unary (self-referencing) relationship example: EMP manages EMP
seminar/*.sql              Model answers for the seminar normalisation tasks

Run (Windows):   py build_shop_db.py   then   py explore_shop_v1.py
Run (macOS/Linux): python3 build_shop_db.py   then   python3 explore_shop_v1.py
Only the Python standard library is needed.
