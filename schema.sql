-- =============================================================================
-- RETAIL ANALYTICS STAR SCHEMA - DDL DEFINITION
-- Dialect: PostgreSQL / DuckDB Compatible
-- =============================================================================

-- Drop tables if they already exist to allow clean re-runs
DROP TABLE IF EXISTS fact_transactions CASCADE;
DROP TABLE IF EXISTS dim_calendar CASCADE;
DROP TABLE IF EXISTS dim_customers CASCADE;
DROP TABLE IF EXISTS dim_products CASCADE;
DROP TABLE IF EXISTS dim_stores CASCADE;

-- -----------------------------------------------------------------------------
-- 1. DIM_STORES
-- -----------------------------------------------------------------------------
CREATE TABLE dim_stores (
    store_id        VARCHAR(20)     NOT NULL,
    store_name      VARCHAR(100)    NOT NULL,
    city            VARCHAR(60)     NOT NULL,
    state           VARCHAR(10)     NOT NULL,
    region          VARCHAR(30)     NOT NULL,
    store_type      VARCHAR(30)     NOT NULL,
    square_footage  INTEGER         NOT NULL CHECK (square_footage > 0),
    opening_date    DATE            NOT NULL,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_dim_stores PRIMARY KEY (store_id)
);

-- Indexing for regional and store type aggregations
CREATE INDEX idx_stores_region ON dim_stores(region);
CREATE INDEX idx_stores_type ON dim_stores(store_type);

-- -----------------------------------------------------------------------------
-- 2. DIM_PRODUCTS
-- -----------------------------------------------------------------------------
CREATE TABLE dim_products (
    product_id      VARCHAR(20)     NOT NULL,
    product_name    VARCHAR(120)    NOT NULL,
    category        VARCHAR(50)     NOT NULL,
    sub_category    VARCHAR(50)     NOT NULL,
    unit_cost       NUMERIC(10, 2)  NOT NULL CHECK (unit_cost >= 0),
    retail_price    NUMERIC(10, 2)  NOT NULL CHECK (retail_price >= unit_cost),
    CONSTRAINT pk_dim_products PRIMARY KEY (product_id)
);

-- Indexing for category slicing and hierarchy drilling
CREATE INDEX idx_products_category ON dim_products(category);
CREATE INDEX idx_products_subcategory ON dim_products(sub_category);

-- -----------------------------------------------------------------------------
-- 3. DIM_CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE TABLE dim_customers (
    customer_id     VARCHAR(20)     NOT NULL,
    first_name      VARCHAR(50)     NOT NULL,
    last_name       VARCHAR(50)     NOT NULL,
    email           VARCHAR(120)    NOT NULL,
    segment         VARCHAR(30)     NOT NULL,
    state           VARCHAR(10)     NOT NULL,
    postal_code     VARCHAR(20)     NOT NULL,
    signup_date     DATE            NOT NULL,
    CONSTRAINT pk_dim_customers PRIMARY KEY (customer_id)
);

-- Indexing for customer segmentation, cohort, and geographic queries
CREATE INDEX idx_customers_segment ON dim_customers(segment);
CREATE INDEX idx_customers_state ON dim_customers(state);
CREATE INDEX idx_customers_signup ON dim_customers(signup_date);

-- -----------------------------------------------------------------------------
-- 4. DIM_CALENDAR
-- -----------------------------------------------------------------------------
CREATE TABLE dim_calendar (
    date_key        INTEGER         NOT NULL, -- Format: YYYYMMDD
    date            DATE            NOT NULL,
    year            INTEGER         NOT NULL,
    quarter         INTEGER         NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    quarter_name    VARCHAR(15)     NOT NULL,
    month           INTEGER         NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_name      VARCHAR(20)     NOT NULL,
    month_short     VARCHAR(10)     NOT NULL,
    day             INTEGER         NOT NULL CHECK (day BETWEEN 1 AND 31),
    day_of_week     INTEGER         NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    day_name        VARCHAR(15)     NOT NULL,
    is_weekend      BOOLEAN         NOT NULL,
    fiscal_quarter  VARCHAR(10)     NOT NULL,
    fiscal_year     INTEGER         NOT NULL,
    CONSTRAINT pk_dim_calendar PRIMARY KEY (date_key),
    CONSTRAINT uq_dim_calendar_date UNIQUE (date)
);

-- Indexing for date joins and time-series rollups
CREATE INDEX idx_calendar_date ON dim_calendar(date);
CREATE INDEX idx_calendar_year_month ON dim_calendar(year, month);
CREATE INDEX idx_calendar_quarter ON dim_calendar(year, quarter);

-- -----------------------------------------------------------------------------
-- 5. FACT_TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE fact_transactions (
    transaction_id  VARCHAR(30)     NOT NULL,
    order_id        VARCHAR(30)     NOT NULL,
    order_date      DATE            NOT NULL,
    date_key        INTEGER         NOT NULL,
    store_id        VARCHAR(20)     NOT NULL,
    product_id      VARCHAR(20)     NOT NULL,
    customer_id     VARCHAR(20)     NOT NULL,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10, 2)  NOT NULL CHECK (unit_price >= 0),
    unit_cost       NUMERIC(10, 2)  NOT NULL CHECK (unit_cost >= 0),
    discount_pct    NUMERIC(5, 4)   NOT NULL DEFAULT 0.0 CHECK (discount_pct >= 0 AND discount_pct <= 1.0),
    discount_amount NUMERIC(10, 2)  NOT NULL DEFAULT 0.0 CHECK (discount_amount >= 0),
    net_revenue     NUMERIC(12, 2)  NOT NULL CHECK (net_revenue >= 0),
    total_cost      NUMERIC(12, 2)  NOT NULL CHECK (total_cost >= 0),
    gross_profit    NUMERIC(12, 2)  NOT NULL,
    shipping_cost   NUMERIC(10, 2)  NOT NULL DEFAULT 0.0 CHECK (shipping_cost >= 0),
    CONSTRAINT pk_fact_transactions PRIMARY KEY (transaction_id),
    CONSTRAINT fk_fact_store FOREIGN KEY (store_id) REFERENCES dim_stores(store_id),
    CONSTRAINT fk_fact_product FOREIGN KEY (product_id) REFERENCES dim_products(product_id),
    CONSTRAINT fk_fact_customer FOREIGN KEY (customer_id) REFERENCES dim_customers(customer_id),
    CONSTRAINT fk_fact_calendar FOREIGN KEY (date_key) REFERENCES dim_calendar(date_key)
);

-- Essential foreign key & analytical query performance indexes
CREATE INDEX idx_fact_store_id ON fact_transactions(store_id);
CREATE INDEX idx_fact_product_id ON fact_transactions(product_id);
CREATE INDEX idx_fact_customer_id ON fact_transactions(customer_id);
CREATE INDEX idx_fact_date_key ON fact_transactions(date_key);
CREATE INDEX idx_fact_order_date ON fact_transactions(order_date);
CREATE INDEX idx_fact_order_id ON fact_transactions(order_id);

-- Composite covering index for time-series and store performance rollups
CREATE INDEX idx_fact_store_date_revenue ON fact_transactions(store_id, order_date, net_revenue);
CREATE INDEX idx_fact_cust_date_revenue ON fact_transactions(customer_id, order_date, net_revenue);

