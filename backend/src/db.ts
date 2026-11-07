import "./env";
import { Database } from "bun:sqlite";
import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";

function resolveDatabasePath(): string {
  const rawPath = process.env.DATABASE_PATH || process.env.DB_PATH;
  if (rawPath) {
    if (path.isAbsolute(rawPath)) return rawPath;

    // 1. Check relative to cwd
    const cwdPath = path.resolve(process.cwd(), rawPath);
    if (existsSync(cwdPath)) return cwdPath;

    // 2. Check relative to project root (2 levels up from src)
    const rootPath = path.resolve(import.meta.dir, "../../", rawPath);
    if (existsSync(rootPath)) return rootPath;

    // 3. Check relative to backend dir (1 level up from src)
    const backendPath = path.resolve(import.meta.dir, "../", rawPath);
    if (existsSync(backendPath)) return backendPath;

    // 4. Strip leading "backend/" or "./backend/" if cwd is already in backend/
    const stripped = rawPath.replace(/^(\.\/)?backend[\\/]/, "");
    const inBackendPath = path.resolve(import.meta.dir, "../", stripped);
    if (existsSync(inBackendPath)) return inBackendPath;

    return cwdPath;
  }

  return path.resolve(import.meta.dir, "../retail_analytics.db");
}

const dbPath = resolveDatabasePath();
mkdirSync(path.dirname(dbPath), { recursive: true });

// Initialize database
export const db = new Database(dbPath, { create: true });

// Enable foreign key constraints and SQLite performance optimizations
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA busy_timeout = 5000;"); // Wait up to 5s before throwing SQLITE_BUSY under concurrency
db.exec("PRAGMA temp_store = MEMORY;");
db.exec("PRAGMA cache_size = -64000;"); // 64MB cache

export function initDatabaseSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dim_stores (
      store_id        TEXT PRIMARY KEY,
      store_name      TEXT NOT NULL,
      city            TEXT NOT NULL,
      state           TEXT NOT NULL,
      region          TEXT NOT NULL,
      store_type      TEXT NOT NULL,
      square_footage  INTEGER NOT NULL CHECK(square_footage >= 0),
      opening_date    TEXT NOT NULL,
      is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS idx_stores_region ON dim_stores(region);
    CREATE INDEX IF NOT EXISTS idx_stores_type ON dim_stores(store_type);

    CREATE TABLE IF NOT EXISTS dim_products (
      product_id      TEXT PRIMARY KEY,
      product_name    TEXT NOT NULL,
      category        TEXT NOT NULL,
      sub_category    TEXT NOT NULL,
      unit_cost       REAL NOT NULL CHECK(unit_cost >= 0),
      retail_price    REAL NOT NULL CHECK(retail_price >= 0)
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
      quarter         INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 4),
      quarter_name    TEXT NOT NULL,
      month           INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      month_name      TEXT NOT NULL,
      month_short     TEXT NOT NULL,
      day             INTEGER NOT NULL CHECK(day BETWEEN 1 AND 31),
      day_of_week     INTEGER NOT NULL,
      day_name        TEXT NOT NULL,
      is_weekend      INTEGER NOT NULL CHECK(is_weekend IN (0, 1)),
      fiscal_quarter  TEXT NOT NULL,
      fiscal_year     INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_calendar_year_month ON dim_calendar(year, month);

    CREATE TABLE IF NOT EXISTS fact_transactions (
      transaction_id  TEXT PRIMARY KEY,
      order_id        TEXT NOT NULL,
      order_date      TEXT NOT NULL,
      date_key        INTEGER NOT NULL,
      store_id        TEXT NOT NULL,
      product_id      TEXT NOT NULL,
      customer_id     TEXT NOT NULL,
      quantity        INTEGER NOT NULL CHECK(quantity > 0),
      unit_price      REAL NOT NULL CHECK(unit_price >= 0),
      unit_cost       REAL NOT NULL CHECK(unit_cost >= 0),
      discount_pct    REAL NOT NULL DEFAULT 0.0 CHECK(discount_pct BETWEEN 0.0 AND 1.0),
      discount_amount REAL NOT NULL DEFAULT 0.0 CHECK(discount_amount >= 0.0),
      net_revenue     REAL NOT NULL CHECK(net_revenue >= -0.01),
      total_cost      REAL NOT NULL CHECK(total_cost >= 0.0),
      gross_profit    REAL NOT NULL,
      shipping_cost   REAL NOT NULL DEFAULT 0.0 CHECK(shipping_cost >= 0.0),
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
    CREATE INDEX IF NOT EXISTS idx_fact_store_date_revenue ON fact_transactions(store_id, order_date, net_revenue);
    CREATE INDEX IF NOT EXISTS idx_fact_cust_date_revenue ON fact_transactions(customer_id, order_date, net_revenue);
  `);
}

// Automatic schema migration runner
export function runMigrations(): void {
  initDatabaseSchema();
  const res = db.query("PRAGMA user_version;").get() as { user_version: number } | null;
  const version = res?.user_version ?? 0;
  if (version < 1) {
    db.exec("PRAGMA user_version = 1;");
  }
}

// Backward and forward compatibility aliases
export const initSchema = initDatabaseSchema;

export function isDbSeeded(): boolean {
  try {
    const row = db.query("SELECT COUNT(*) as count FROM fact_transactions").get() as { count: number };
    return Boolean(row && row.count > 0);
  } catch {
    return false;
  }
}
