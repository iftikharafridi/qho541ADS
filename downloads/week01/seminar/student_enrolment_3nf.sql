-- Week 1 seminar, Task 4: Student enrolment normalised to 3NF (model answer)
-- Source: "Normalization Forms extra tasks (2).pptx", Example 2.
-- Findings:
--   * "Module number" holds lists (COM10, COM67): a 1NF violation -> enrolment table.
--   * "COM 67" and "COM67" are the same module written two ways: clean data first.
--   * Fee depends on fee status (Home / International), which depends on country:
--     student -> country -> fee_status -> annual_fee is a transitive chain.
PRAGMA foreign_keys = ON;

CREATE TABLE fee_status (
    fee_status   TEXT PRIMARY KEY NOT NULL,          -- 'Home' or 'International'
    annual_fee   INTEGER NOT NULL CHECK (annual_fee >= 0)
);

CREATE TABLE country (
    country_id   INTEGER PRIMARY KEY,
    country_name TEXT NOT NULL UNIQUE,
    fee_status   TEXT NOT NULL REFERENCES fee_status (fee_status)
);

CREATE TABLE student (
    student_id   INTEGER PRIMARY KEY,
    first_name   TEXT NOT NULL,
    last_name    TEXT NOT NULL,
    mobile       TEXT,
    home_phone   TEXT,
    country_id   INTEGER NOT NULL REFERENCES country (country_id)
);

CREATE TABLE module (
    module_code  TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE enrolment (
    student_id   INTEGER NOT NULL REFERENCES student (student_id) ON DELETE CASCADE,
    module_code  TEXT    NOT NULL REFERENCES module (module_code),
    PRIMARY KEY (student_id, module_code)
);

INSERT INTO fee_status VALUES ('Home', 9250), ('International', 16000);
INSERT INTO country VALUES (1, 'UK', 'Home'), (2, 'Germany', 'International'), (3, 'France', 'International');
INSERT INTO student VALUES
    (1, 'Jake',   'Green',  '0775252362', '0280909898',   1),
    (2, 'James',  'Smith',  '0775523256', '0230909898',   1),
    (3, 'Roman',  'Morris', '0775252362', '+97670909898', 2),
    (4, 'Andy',   'Smith',  '0775252362', '0280009898',   1),
    (5, 'Karen',  'Helord', '0775252362', '+8700787898',  3);
INSERT INTO module VALUES ('COM10'), ('COM45'), ('COM56'), ('COM67'), ('COM68'), ('COM88');
INSERT INTO enrolment VALUES
    (1, 'COM10'), (1, 'COM67'),
    (2, 'COM10'), (2, 'COM56'),
    (3, 'COM56'), (3, 'COM67'), (3, 'COM10'),
    (4, 'COM67'), (4, 'COM45'),
    (5, 'COM88'), (5, 'COM68');
