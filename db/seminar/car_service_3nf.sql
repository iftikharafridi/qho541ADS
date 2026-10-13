-- Week 1 seminar, Task 3: Car service centre normalised to 3NF (model answer)
-- Source: "Normalization Forms extra tasks (2).pptx" (Week 1 extra tasks).
-- Assumptions and data problems found in the flat file:
--   * James owns two cars but only one service is listed: we assume HN16YOP.
--   * Roman has two cars and two services: we assume Lock change on OP18KIK and
--     Tyre change on NM09JKL. His row shows one charge (150) for two services, so
--     the tyre-change charge is missing: we use the standard 50.
--   * The charge depends only on the type of service (Oil 100, Filter 20, Tyre 50,
--     Lock 150), so it is stored once in service_type (removes a transitive dependency).
--   * No dates in the source, so service_date is allowed to be NULL here.
PRAGMA foreign_keys = ON;

CREATE TABLE owner (
    owner_id      INTEGER PRIMARY KEY,
    owner_name    TEXT NOT NULL,
    phone         TEXT
);

CREATE TABLE car (
    reg_no        TEXT PRIMARY KEY NOT NULL,     -- natural key (NOT NULL: SQLite allows NULL in non-integer PKs otherwise)
    owner_id      INTEGER NOT NULL REFERENCES owner (owner_id)
);

CREATE TABLE service_centre (
    centre_id     INTEGER PRIMARY KEY,
    centre_name   TEXT NOT NULL UNIQUE
);

CREATE TABLE service_type (
    service_code    TEXT PRIMARY KEY NOT NULL,
    description     TEXT NOT NULL UNIQUE,
    standard_charge REAL NOT NULL CHECK (standard_charge >= 0)
);

CREATE TABLE service_job (
    job_id        INTEGER PRIMARY KEY,
    reg_no        TEXT    NOT NULL REFERENCES car (reg_no),
    centre_id     INTEGER NOT NULL REFERENCES service_centre (centre_id),
    service_code  TEXT    NOT NULL REFERENCES service_type (service_code),
    service_date  TEXT                                   -- unknown in the source data
);

INSERT INTO owner VALUES (1, 'Jake', '0775252362'), (2, 'James', '0775523256'),
    (3, 'Roman', '0775252362'), (4, 'Andy', '0775252362'), (5, 'Karen', '0775252362');
INSERT INTO car VALUES ('AV15HUP', 1), ('HN16YOP', 2), ('NN71KLM', 2), ('OP18KIK', 3),
    ('NM09JKL', 3), ('PK15KYH', 4), ('NN12MYJ', 5);
INSERT INTO service_centre VALUES (1, 'Southampton'), (2, 'Portsmouth');
INSERT INTO service_type VALUES ('OIL', 'Oil change', 100), ('FLT', 'Filter change', 20),
    ('TYR', 'Tyre change', 50), ('LCK', 'Lock change', 150);
INSERT INTO service_job (job_id, reg_no, centre_id, service_code) VALUES
    (1, 'AV15HUP', 1, 'OIL'), (2, 'AV15HUP', 1, 'FLT'), (3, 'AV15HUP', 1, 'TYR'),
    (4, 'HN16YOP', 1, 'TYR'),
    (5, 'OP18KIK', 1, 'LCK'), (6, 'NM09JKL', 1, 'TYR'),
    (7, 'PK15KYH', 2, 'OIL'),
    (8, 'NN12MYJ', 2, 'TYR'), (9, 'NN12MYJ', 2, 'OIL');
