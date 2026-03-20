import duckdb
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sample.duckdb")
conn = duckdb.connect(DB_PATH)

# --- Sales transactions table ---
conn.execute("""
CREATE OR REPLACE TABLE sales (
    sale_id      INTEGER,
    sale_date    DATE,
    region       VARCHAR,
    product_category VARCHAR,
    salesperson  VARCHAR,
    revenue      FLOAT,
    units_sold   INTEGER,
    discount_pct FLOAT
)
""")

conn.execute("""
INSERT INTO sales VALUES
(1,  '2024-01-05', 'North', 'Electronics', 'Aisha',  45000, 12, 5.0),
(2,  '2024-01-12', 'South', 'Apparel',     'Rohan',  18000, 40, 10.0),
(3,  '2024-01-18', 'East',  'Electronics', 'Priya',  62000, 18, 0.0),
(4,  '2024-02-03', 'West',  'Furniture',   'Dev',    31000, 8,  2.5),
(5,  '2024-02-14', 'North', 'Apparel',     'Aisha',  22000, 55, 15.0),
(6,  '2024-02-20', 'South', 'Electronics', 'Rohan',  58000, 16, 0.0),
(7,  '2024-03-01', 'East',  'Furniture',   'Priya',  27000, 6,  5.0),
(8,  '2024-03-15', 'West',  'Electronics', 'Dev',    71000, 20, 0.0),
(9,  '2024-03-22', 'North', 'Electronics', 'Aisha',  38000, 10, 8.0),
(10, '2024-04-04', 'South', 'Furniture',   'Rohan',  44000, 11, 3.0),
(11, '2024-04-18', 'East',  'Apparel',     'Priya',  15000, 35, 20.0),
(12, '2024-04-25', 'West',  'Apparel',     'Dev',    19000, 45, 12.0),
(13, '2024-05-06', 'North', 'Furniture',   'Aisha',  52000, 13, 0.0),
(14, '2024-05-19', 'South', 'Electronics', 'Rohan',  33000, 9,  5.0),
(15, '2024-06-02', 'East',  'Electronics', 'Priya',  81000, 23, 0.0),
(16, '2024-06-14', 'West',  'Furniture',   'Dev',    29000, 7,  2.0),
(17, '2024-07-01', 'North', 'Apparel',     'Aisha',  11000, 28, 25.0),
(18, '2024-07-15', 'South', 'Apparel',     'Rohan',  24000, 60, 10.0),
(19, '2024-08-08', 'East',  'Furniture',   'Priya',  36000, 9,  0.0),
(20, '2024-08-22', 'West',  'Electronics', 'Dev',    67000, 19, 3.0)
""")

# --- Monthly regional targets table ---
conn.execute("""
CREATE OR REPLACE TABLE regional_targets (
    month        VARCHAR,
    region       VARCHAR,
    target_revenue FLOAT,
    actual_revenue FLOAT
)
""")

conn.execute("""
INSERT INTO regional_targets VALUES
('2024-01', 'North', 50000, 45000),
('2024-01', 'South', 20000, 18000),
('2024-01', 'East',  60000, 62000),
('2024-01', 'West',  30000, 31000),
('2024-02', 'North', 52000, 22000),
('2024-02', 'South', 22000, 58000),
('2024-02', 'East',  62000, 27000),
('2024-02', 'West',  32000, 71000),
('2024-03', 'North', 54000, 38000),
('2024-03', 'South', 24000, 44000),
('2024-03', 'East',  64000, 15000),
('2024-03', 'West',  34000, 19000)
""")

# --- Employee headcount table ---
conn.execute("""
CREATE OR REPLACE TABLE employees (
    emp_id       INTEGER,
    name         VARCHAR,
    department   VARCHAR,
    role         VARCHAR,
    salary       INTEGER,
    joining_date DATE,
    region       VARCHAR,
    active       BOOLEAN
)
""")

conn.execute("""
INSERT INTO employees VALUES
(1, 'Aisha',  'Sales',   'Senior Rep',  75000, '2021-03-15', 'North', true),
(2, 'Rohan',  'Sales',   'Rep',         55000, '2022-07-01', 'South', true),
(3, 'Priya',  'Sales',   'Senior Rep',  78000, '2020-11-20', 'East',  true),
(4, 'Dev',    'Sales',   'Rep',         57000, '2022-01-10', 'West',  true),
(5, 'Meera',  'Finance', 'Analyst',     65000, '2021-06-01', 'North', true),
(6, 'Arjun',  'Finance', 'Manager',     90000, '2019-04-15', 'East',  true),
(7, 'Sana',   'Tech',    'Engineer',    95000, '2022-09-01', 'West',  true),
(8, 'Vikram', 'Tech',    'Lead',       120000, '2018-02-28', 'North', true),
(9, 'Nisha',  'HR',      'Manager',     70000, '2020-08-10', 'South', false),
(10,'Karan',  'Tech',    'Engineer',    92000, '2023-01-15', 'East',  true)
""")

conn.close()
print("Database seeded successfully at:", DB_PATH)