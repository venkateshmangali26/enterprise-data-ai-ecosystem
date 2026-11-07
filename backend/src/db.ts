import { Database } from "bun:sqlite";
import path from "path";

const dbPath = process.env.DATABASE_PATH || process.env.DB_PATH || path.resolve(__dirname, "../retail_analytics.db");
export const db = new Database(dbPath, { create: true });

// Enable Write-Ahead Logging (WAL) and memory optimizations for high throughput
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA temp_store = MEMORY;");
db.exec("PRAGMA cache_size = -64000;"); // 64MB cache

export function initDatabaseSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dim_stores (
      store_id        TEXT PRIMARY KEY,
      store_name      TEXT NOT NULL,
      city            TEXT NOT NULL,
      state           TEXT NOT NULL,
      region          TEXT NOT NULL,
      store_type      TEXT NOT NULL,
      square_footage  INTEGER NOT NULL,
      opening_date    TEXT NOT NULL,
      is_active       INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_stores_region ON dim_stores(region);
    CREATE INDEX IF NOT EXISTS idx_stores_type ON dim_stores(store_type);

    CREATE TABLE IF NOT EXISTS dim_products (
      product_id      TEXT PRIMARY KEY,
      product_name    TEXT NOT NULL,
      category        TEXT NOT NULL,
      sub_category    TEXT NOT NULL,
      unit_cost       REAL NOT NULL,
      retail_price    REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON dim_products(category);
    CREATE INDEX IF NOT EXISTS idx_products_subcategory ON dim_products(sub_category);

    CREATE TABLE IF NOT EXISTS dim_customers (
      customer_id     TEXT PRIMARY KEY,
      first_name      TEXT NOT NULL,
      last_name       TEXT NOT NULL,
      email           TEXT NOT NULL,
      segment         TEXT NOT NULL,
      state           TEXT NOT NULL,
      postal_code     TEXT NOT NULL,
      signup_date     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_segment ON dim_customers(segment);
    CREATE INDEX IF NOT EXISTS idx_customers_state ON dim_customers(state);

    CREATE TABLE IF NOT EXISTS dim_calendar (
      date_key        INTEGER PRIMARY KEY,
      date            TEXT UNIQUE NOT NULL,
      year            INTEGER NOT NULL,
      quarter         INTEGER NOT NULL,
      quarter_name    TEXT NOT NULL,
      month           INTEGER NOT NULL,
      month_name      TEXT NOT NULL,
      month_short     TEXT NOT NULL,
      day             INTEGER NOT NULL,
      day_of_week     INTEGER NOT NULL,
      day_name        TEXT NOT NULL,
      is_weekend      INTEGER NOT NULL,
      fiscal_quarter  TEXT NOT NULL,
      fiscal_year     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_date ON dim_calendar(date);
    CREATE INDEX IF NOT EXISTS idx_calendar_year_month ON dim_calendar(year, month);

    CREATE TABLE IF NOT EXISTS fact_transactions (
      transaction_id  TEXT PRIMARY KEY,
      order_id        TEXT NOT NULL,
      order_date      TEXT NOT NULL,
      date_key        INTEGER NOT NULL,
      store_id        TEXT NOT NULL,
      product_id      TEXT NOT NULL,
      customer_id     TEXT NOT NULL,
      quantity        INTEGER NOT NULL,
      unit_price      REAL NOT NULL,
      unit_cost       REAL NOT NULL,
      discount_pct    REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      net_revenue     REAL NOT NULL,
      total_cost      REAL NOT NULL,
      gross_profit    REAL NOT NULL,
      shipping_cost   REAL NOT NULL DEFAULT 0.0,
      FOREIGN KEY (store_id) REFERENCES dim_stores(store_id),
      FOREIGN KEY (product_id) REFERENCES dim_products(product_id),
      FOREIGN KEY (customer_id) REFERENCES dim_customers(customer_id),
      FOREIGN KEY (date_key) REFERENCES dim_calendar(date_key)
    );

    CREATE INDEX IF NOT EXISTS idx_fact_store_id ON fact_transactions(store_id);
    CREATE INDEX IF NOT EXISTS idx_fact_product_id ON fact_transactions(product_id);
    CREATE INDEX IF NOT EXISTS idx_fact_customer_id ON fact_transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_fact_date_key ON fact_transactions(date_key);
    CREATE INDEX IF NOT EXISTS idx_fact_order_date ON fact_transactions(order_date);
    CREATE INDEX IF NOT EXISTS idx_fact_order_id ON fact_transactions(order_id);
  `);
}

