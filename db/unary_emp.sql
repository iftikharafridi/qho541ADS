-- Week 1: a unary (self-referencing) relationship.
-- Rows taken from the EMP table in the original Week 1 Database.db:
-- each employee's mgr column holds the empno of their manager.
PRAGMA foreign_keys = ON;

CREATE TABLE emp (
    empno   INTEGER PRIMARY KEY,
    ename   TEXT NOT NULL,
    job     TEXT NOT NULL,
    mgr     INTEGER REFERENCES emp (empno)      -- NULL = no manager (the president)
);

-- Insert managers before the people they manage, so every mgr value already exists.
INSERT INTO emp VALUES
    (7839, 'KING',   'PRESIDENT', NULL),
    (7566, 'JONES',  'MANAGER',   7839),
    (7698, 'BLAKE',  'MANAGER',   7839),
    (7782, 'CLARK',  'MANAGER',   7839),
    (7788, 'SCOTT',  'ANALYST',   7566),
    (7902, 'FORD',   'ANALYST',   7566),
    (7369, 'SMITH',  'CLERK',     7902),
    (7876, 'ADAMS',  'CLERK',     7788),
    (7499, 'ALLEN',  'SALESREP',  7698),
    (7521, 'WARD',   'SALESREP',  7698),
    (7654, 'MARTIN', 'SALESREP',  7698),
    (7844, 'TURNER', 'SALESREP',  7698),
    (7900, 'JAMES',  'CLERK',     7698),
    (7934, 'MILLER', 'CLERK',     7782);
