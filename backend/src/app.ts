import { db, initDatabaseSchema } from "./db";
import path from "path";
import { existsSync, statSync } from "fs";

// Initialize database schema on module load
initDatabaseSchema();

const DIST_DIR = process.env.DIST_DIR || path.resolve(import.meta.dir, "../../frontend/dist");

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3001"
)
  .split(",")
  .map((s) => s.trim());

// Configurable Authentication Middleware
// When REQUIRE_AUTH is true, requests to protected endpoints require Authorization: Bearer <API_TOKEN>
export const REQUIRE_AUTH = process.env.REQUIRE_AUTH === "true";
export const API_TOKEN =
  process.env.API_TOKEN || process.env.API_KEY || "retail-analytics-secure-token-2025";

export function checkAuth(req: Request): boolean {
  if (!REQUIRE_AUTH) {
    return true;
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return false;
  return parts[1] === API_TOKEN;
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin");
  let allowed = ALLOWED_ORIGINS[0];
  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"))) {
    allowed = origin;
  }
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(req),
    },
  });
}

export function jsonError(message: string, status = 500, endpointPath?: string, req?: Request): Response {
  const isProd = process.env.NODE_ENV === "production";
  const clientMessage = isProd && status >= 500 ? "Internal Server Error" : message;
  return new Response(
    JSON.stringify({
      ok: false,
      error: clientMessage,
      path: endpointPath,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(req),
      },
    }
  );
}

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    });
  }

  // 2. Method guard: Enforce GET on all API read endpoints
  if (url.pathname.startsWith("/api/") && req.method !== "GET") {
    return jsonError("Method Not Allowed", 405, url.pathname, req);
  }

  // 3. Security Guard: Authentication check for sensitive data endpoints
  const isProtectedCustomerRoute =
    url.pathname === "/api/customer-segments" ||
    url.pathname === "/api/transactions" ||
    url.pathname.startsWith("/api/transactions/");

  if (isProtectedCustomerRoute && !checkAuth(req)) {
    return jsonError("Unauthorized: Missing or invalid Bearer token", 401, url.pathname, req);
  }

  try {
    // Endpoint 1: Health check
    if (url.pathname === "/api/health") {
      const stats = db.query(`
        SELECT 
          (SELECT COUNT(*) FROM fact_transactions) as transactions,
          (SELECT COUNT(*) FROM dim_stores) as stores,
          (SELECT COUNT(*) FROM dim_products) as products,
          (SELECT COUNT(*) FROM dim_customers) as customers
      `).get() as Record<string, number>;

      return jsonResponse(
        {
          status: "healthy",
          server: "Bun + Native SQLite",
          counts: stats,
          auth_enabled: REQUIRE_AUTH,
          timestamp: new Date().toISOString(),
        },
        200,
        req
      );
    }

    // Endpoint 2: Executive Overview KPIs
    if (url.pathname === "/api/overview") {
      const region = url.searchParams.get("region");
      const category = url.searchParams.get("category");

      let filterClause = "1=1";
      const params: (string | number)[] = [];

      if (region && region !== "All") {
        filterClause += " AND s.region = ?";
        params.push(region);
      }
      if (category && category !== "All") {
        filterClause += " AND p.category = ?";
        params.push(category);
      }

      // Aggregate KPI query protected with COALESCE for empty tables
      const query = `
        SELECT 
          COALESCE(ROUND(SUM(f.net_revenue), 2), 0.0) AS total_revenue,
          COALESCE(ROUND(SUM(f.total_cost), 2), 0.0) AS total_cost,
          COALESCE(ROUND(SUM(f.gross_profit), 2), 0.0) AS gross_profit,
          COALESCE(ROUND(100.0 * SUM(f.gross_profit) / NULLIF(SUM(f.net_revenue), 0), 2), 0.0) AS profit_margin_pct,
          COALESCE(COUNT(DISTINCT f.order_id), 0) AS total_orders,
          COALESCE(SUM(f.quantity), 0) AS total_units_sold,
          COALESCE(COUNT(DISTINCT f.customer_id), 0) AS active_customers,
          COALESCE(ROUND(SUM(f.net_revenue) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2), 0.0) AS average_order_value,
          COALESCE(ROUND(100.0 * SUM(f.discount_amount) / NULLIF(SUM(f.net_revenue + f.discount_amount), 0), 2), 0.0) AS avg_discount_pct
        FROM fact_transactions f
        JOIN dim_stores s ON f.store_id = s.store_id
        JOIN dim_products p ON f.product_id = p.product_id
        WHERE ${filterClause}
      `;
      const kpis = db.prepare(query).get(...params) as Record<string, number>;

      // Robust calendar-month MoM calculation:
      // Finds the latest active year/month and strictly pairs it with the immediate preceding calendar month
      const latestMonthQuery = `
        SELECT c.year, c.month
        FROM fact_transactions f
        JOIN dim_calendar c ON f.date_key = c.date_key
        JOIN dim_stores s ON f.store_id = s.store_id
        JOIN dim_products p ON f.product_id = p.product_id
        WHERE ${filterClause}
        ORDER BY c.year DESC, c.month DESC
        LIMIT 1
      `;
      const latestPeriod = db.prepare(latestMonthQuery).get(...params) as { year: number; month: number } | null;

      let momGrowthPct: number | null = null;
      let currentMonthRevenue = 0;
      let priorMonthRevenue = 0;

      if (latestPeriod) {
        const currYear = latestPeriod.year;
        const currMonth = latestPeriod.month;
        const priorYear = currMonth === 1 ? currYear - 1 : currYear;
        const priorMonth = currMonth === 1 ? 12 : currMonth - 1;

        const monthlyRevQuery = `
          SELECT 
            COALESCE(ROUND(SUM(CASE WHEN c.year = ? AND c.month = ? THEN f.net_revenue ELSE 0 END), 2), 0.0) AS curr_rev,
            COALESCE(ROUND(SUM(CASE WHEN c.year = ? AND c.month = ? THEN f.net_revenue ELSE 0 END), 2), 0.0) AS prior_rev
          FROM fact_transactions f
          JOIN dim_calendar c ON f.date_key = c.date_key
          JOIN dim_stores s ON f.store_id = s.store_id
          JOIN dim_products p ON f.product_id = p.product_id
          WHERE ${filterClause}
        `;
        const revRow = db.prepare(monthlyRevQuery).get(
          currYear,
          currMonth,
          priorYear,
          priorMonth,
          ...params
        ) as { curr_rev: number; prior_rev: number };

        currentMonthRevenue = revRow?.curr_rev ?? 0;
        priorMonthRevenue = revRow?.prior_rev ?? 0;

        if (priorMonthRevenue > 0) {
          momGrowthPct = Math.round(10000.0 * (currentMonthRevenue - priorMonthRevenue) / priorMonthRevenue) / 100.0;
        }
      }

      return jsonResponse(
        {
          total_revenue: Number(kpis?.total_revenue ?? 0),
          total_cost: Number(kpis?.total_cost ?? 0),
          gross_profit: Number(kpis?.gross_profit ?? 0),
          profit_margin_pct: Number(kpis?.profit_margin_pct ?? 0),
          total_orders: Number(kpis?.total_orders ?? 0),
          total_units_sold: Number(kpis?.total_units_sold ?? 0),
          active_customers: Number(kpis?.active_customers ?? 0),
          average_order_value: Number(kpis?.average_order_value ?? 0),
          avg_discount_pct: Number(kpis?.avg_discount_pct ?? 0),
          mom_growth_pct: momGrowthPct,
          current_month_revenue: currentMonthRevenue,
          prior_month_revenue: priorMonthRevenue,
        },
        200,
        req
      );
    }

    // Endpoint 3: Revenue Trends (MoM Growth & Running YTD by Region with continuous calendar spine)
    if (url.pathname === "/api/revenue-trend") {
      const region = url.searchParams.get("region");
      let filterStores = "";
      let filterActuals = "";
      const spineParams: (string | number)[] = [];
      const actualsParams: (string | number)[] = [];

      if (region && region !== "All") {
        filterStores = "WHERE region = ?";
        filterActuals = "WHERE s.region = ?";
        spineParams.push(region);
        actualsParams.push(region);
      }

      const query = `
        WITH calendar_bounds AS (
          SELECT MIN(c.date) as min_date, MAX(c.date) as max_date
          FROM fact_transactions f
          JOIN dim_calendar c ON f.date_key = c.date_key
        ),
        distinct_periods AS (
          SELECT DISTINCT 
            c.year, 
            c.month, 
            c.month_short, 
            c.month_name, 
            printf('%04d-%02d', c.year, c.month) as period
          FROM dim_calendar c
          WHERE c.date >= (SELECT min_date FROM calendar_bounds) 
            AND c.date <= (SELECT max_date FROM calendar_bounds)
        ),
        regions AS (
          SELECT DISTINCT region FROM dim_stores ${filterStores}
        ),
        regional_spine AS (
          SELECT r.region, p.year, p.month, p.month_short, p.month_name, p.period
          FROM regions r
          CROSS JOIN distinct_periods p
        ),
        monthly_actuals AS (
          SELECT 
            s.region,
            c.year,
            c.month,
            ROUND(SUM(f.net_revenue), 2) AS monthly_revenue,
            ROUND(SUM(f.gross_profit), 2) AS monthly_profit,
            SUM(f.quantity) AS units_sold,
            COUNT(DISTINCT f.order_id) AS order_count
          FROM fact_transactions f
          JOIN dim_stores s ON f.store_id = s.store_id
          JOIN dim_calendar c ON f.date_key = c.date_key
          ${filterActuals}
          GROUP BY s.region, c.year, c.month
        ),
        windowed AS (
          SELECT 
            rs.region,
            rs.year,
            rs.month,
            rs.month_short,
            rs.month_name,
            rs.period,
            COALESCE(ma.monthly_revenue, 0.0) AS monthly_revenue,
            COALESCE(ma.monthly_profit, 0.0) AS monthly_profit,
            COALESCE(ma.units_sold, 0) AS units_sold,
            COALESCE(ma.order_count, 0) AS order_count,
            LAG(COALESCE(ma.monthly_revenue, 0.0), 1) OVER (
              PARTITION BY rs.region ORDER BY rs.year, rs.month
            ) AS prev_month_revenue,
            SUM(COALESCE(ma.monthly_revenue, 0.0)) OVER (
              PARTITION BY rs.region, rs.year 
              ORDER BY rs.month 
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS running_ytd_revenue
          FROM regional_spine rs
          LEFT JOIN monthly_actuals ma 
            ON rs.region = ma.region AND rs.year = ma.year AND rs.month = ma.month
        )
        SELECT 
          region,
          year,
          month,
          month_short,
          month_name,
          period,
          monthly_revenue,
          monthly_profit,
          COALESCE(prev_month_revenue, 0.0) AS prev_month_revenue,
          CASE
            WHEN prev_month_revenue IS NULL OR prev_month_revenue = 0 THEN NULL
            ELSE ROUND(100.0 * (monthly_revenue - prev_month_revenue) / prev_month_revenue, 2)
          END AS mom_growth_pct,
          running_ytd_revenue,
          units_sold,
          order_count
        FROM windowed
        ORDER BY year ASC, month ASC, region ASC
      `;
      const rows = db.prepare(query).all(...spineParams, ...actualsParams);
      return jsonResponse(rows, 200, req);
    }

    // Endpoint 4: Top Stores Ranked by Margin & Volume (Validated limit)
    if (url.pathname === "/api/stores/top") {
      const requestedLimit = Number(url.searchParams.get("limit") || 10);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
        : 10;

      const region = url.searchParams.get("region");
      let filter = "1=1";
      const params: (string | number)[] = [];
      if (region && region !== "All") {
        filter += " AND s.region = ?";
        params.push(region);
      }

      const query = `
        WITH store_totals AS (
          SELECT 
            s.store_id,
            s.store_name,
            s.city,
            s.state,
            s.region,
            s.store_type,
            s.square_footage,
            SUM(f.quantity) AS total_volume_sold,
            COUNT(DISTINCT f.order_id) AS total_orders,
            ROUND(SUM(f.net_revenue), 2) AS total_revenue,
            ROUND(SUM(f.total_cost), 2) AS total_cost,
            ROUND(SUM(f.gross_profit), 2) AS total_profit
          FROM fact_transactions f
          JOIN dim_stores s ON f.store_id = s.store_id
          WHERE ${filter}
          GROUP BY s.store_id, s.store_name, s.city, s.state, s.region, s.store_type, s.square_footage
        ),
        metrics AS (
          SELECT 
            *,
            ROUND(100.0 * total_profit / NULLIF(total_revenue, 0), 2) AS profit_margin_pct,
            ROUND(total_revenue / NULLIF(square_footage, 0), 2) AS revenue_per_sqft
          FROM store_totals
        ),
        ranked AS (
          SELECT 
            *,
            DENSE_RANK() OVER (ORDER BY profit_margin_pct DESC) AS margin_rank,
            DENSE_RANK() OVER (ORDER BY total_volume_sold DESC) AS volume_rank,
            ROW_NUMBER() OVER (ORDER BY profit_margin_pct DESC, total_volume_sold DESC) AS primary_rank
          FROM metrics
        )
        SELECT * FROM ranked
        ORDER BY primary_rank ASC
        LIMIT ?
      `;
      params.push(limit);
      const rows = db.prepare(query).all(...params);
      return jsonResponse(rows, 200, req);
    }

    // Endpoint 5: Customer Segmentation (RFM Analysis with Correct Segment Precedence)
    if (url.pathname === "/api/customer-segments") {
      const query = `
        WITH reference_date AS (
          SELECT date(MAX(order_date), '+1 day') as snapshot_date FROM fact_transactions
        ),
        customer_rfm AS (
          SELECT 
            c.customer_id,
            c.first_name || ' ' || c.last_name AS customer_name,
            c.segment AS customer_profile,
            c.state,
            CAST((julianday((SELECT snapshot_date FROM reference_date)) - julianday(MAX(f.order_date))) AS INTEGER) AS recency_days,
            COUNT(DISTINCT f.order_id) AS frequency,
            ROUND(SUM(f.net_revenue), 2) AS monetary
          FROM dim_customers c
          JOIN fact_transactions f ON c.customer_id = f.customer_id
          GROUP BY c.customer_id, c.first_name, c.last_name, c.segment, c.state
        ),
        quintiles AS (
          SELECT 
            *,
            NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
            NTILE(5) OVER (ORDER BY frequency ASC) AS f_score,
            NTILE(5) OVER (ORDER BY monetary ASC) AS m_score
          FROM customer_rfm
        ),
        segmented AS (
          SELECT 
            *,
            CASE 
              WHEN r_score >= 4 AND f_score >= 4 AND m_score >= 4 THEN 'Champions'
              WHEN r_score >= 3 AND f_score >= 3 AND m_score >= 3 THEN 'Loyal Customers'
              WHEN r_score >= 4 AND f_score = 1                   THEN 'Recent Customers'
              WHEN r_score >= 4 AND f_score <= 3                  THEN 'Potential Loyalists'
              WHEN r_score = 1 AND f_score >= 4                   THEN 'Cannot Lose Them'
              WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At Risk'
              WHEN r_score <= 2 AND f_score <= 2                  THEN 'Hibernating / Lost'
              ELSE 'Needs Attention'
            END AS rfm_segment
          FROM quintiles
        )
        SELECT 
          rfm_segment,
          COUNT(*) AS total_customers,
          ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM segmented), 2) AS customer_share_pct,
          ROUND(AVG(recency_days), 1) AS avg_recency_days,
          ROUND(AVG(frequency), 2) AS avg_order_count,
          ROUND(AVG(monetary), 2) AS avg_monetary_spend,
          ROUND(SUM(monetary), 2) AS total_segment_revenue,
          ROUND(100.0 * SUM(monetary) / (SELECT SUM(monetary) FROM segmented), 2) AS revenue_contribution_pct
        FROM segmented
        GROUP BY rfm_segment
        ORDER BY total_segment_revenue DESC
      `;
      const segmentsResult = db.prepare(query).all();
      return jsonResponse(segmentsResult, 200, req);
    }

    // Endpoint 6: Category Financial Breakdown
    if (url.pathname === "/api/categories") {
      const query = `
        SELECT 
          p.category,
          p.sub_category,
          ROUND(SUM(f.net_revenue), 2) AS total_revenue,
          ROUND(SUM(f.total_cost), 2) AS total_cost,
          ROUND(SUM(f.gross_profit), 2) AS gross_profit,
          ROUND(100.0 * SUM(f.gross_profit) / NULLIF(SUM(f.net_revenue), 0), 2) AS profit_margin_pct,
          SUM(f.quantity) AS total_units_sold,
          SUM(f.quantity) AS units_sold,
          COUNT(DISTINCT f.order_id) AS total_orders,
          COUNT(DISTINCT f.order_id) AS order_count,
          ROUND(100.0 * SUM(f.discount_amount) / NULLIF(SUM(f.net_revenue + f.discount_amount), 0), 2) AS avg_discount_pct
        FROM fact_transactions f
        JOIN dim_products p ON f.product_id = p.product_id
        GROUP BY p.category, p.sub_category
        ORDER BY total_revenue DESC
      `;
      const categoriesResult = db.prepare(query).all();
      return jsonResponse(categoriesResult, 200, req);
    }

    // Endpoint 7: Store List for Filters
    if (url.pathname === "/api/stores") {
      const query = `
        SELECT store_id, store_name, city, state, region, store_type, square_footage 
        FROM dim_stores 
        ORDER BY region, city
      `;
      const stores = db.prepare(query).all();
      return jsonResponse(stores, 200, req);
    }

    // Endpoint 8: Transactions Explorer Table (Searchable & Paginated with strictly sanitized inputs)
    if (url.pathname === "/api/transactions") {
      const requestedPage = Number(url.searchParams.get("page") || 1);
      const requestedLimit = Number(url.searchParams.get("limit") || 15);

      const MAX_PAGE = 100_000;
      const page = Number.isSafeInteger(requestedPage)
        ? Math.min(MAX_PAGE, Math.max(1, requestedPage))
        : 1;

      const limit = Number.isFinite(requestedLimit)
        ? Math.min(100, Math.max(10, Math.floor(requestedLimit)))
        : 15;

      const rawSearch = (url.searchParams.get("search") || "").trim();
      const search = rawSearch.slice(0, 100); // Guard against memory exhaustion
      const region = url.searchParams.get("region");
      const category = url.searchParams.get("category");
      const storeId = url.searchParams.get("storeId");
      const sortCol = url.searchParams.get("sortBy") || "order_date";
      const sortDir = url.searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";

      const validSortCols: Record<string, string> = {
        order_date: "f.order_date",
        net_revenue: "f.net_revenue",
        quantity: "f.quantity",
        gross_profit: "f.gross_profit",
        unit_price: "f.unit_price",
      };
      const orderBy = validSortCols[sortCol] || "f.order_date";

      let where = "1=1";
      const params: (string | number)[] = [];

      if (search) {
        where += ` AND (f.order_id LIKE ? OR f.customer_id LIKE ? OR p.product_name LIKE ? OR s.store_name LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (region && region !== "All") {
        where += " AND s.region = ?";
        params.push(region);
      }
      if (category && category !== "All") {
        where += " AND p.category = ?";
        params.push(category);
      }
      if (storeId && storeId !== "All") {
        where += " AND f.store_id = ?";
        params.push(storeId);
      }

      const countQuery = `
        SELECT COUNT(*) as total
        FROM fact_transactions f
        JOIN dim_stores s ON f.store_id = s.store_id
        JOIN dim_products p ON f.product_id = p.product_id
        JOIN dim_customers c ON f.customer_id = c.customer_id
        WHERE ${where}
      `;
      const countRes = db.prepare(countQuery).get(...params) as { total: number };
      const total = countRes?.total ?? 0;

      const rawOffset = (page - 1) * limit;
      const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

      const dataQuery = `
        SELECT 
          f.transaction_id,
          f.order_id,
          f.order_date,
          s.store_id,
          s.store_name,
          s.city,
          s.region,
          p.product_id,
          p.product_name,
          p.category,
          p.sub_category,
          c.customer_id,
          c.first_name || ' ' || c.last_name AS customer_name,
          c.segment AS customer_segment,
          f.quantity,
          f.unit_price,
          f.unit_cost,
          f.discount_pct,
          f.net_revenue,
          f.total_cost,
          f.gross_profit,
          ROUND(100.0 * f.gross_profit / NULLIF(f.net_revenue, 0), 1) as profit_margin_pct,
          f.shipping_cost
        FROM fact_transactions f
        JOIN dim_stores s ON f.store_id = s.store_id
        JOIN dim_products p ON f.product_id = p.product_id
        JOIN dim_customers c ON f.customer_id = c.customer_id
        WHERE ${where}
        ORDER BY ${orderBy} ${sortDir}
        LIMIT ? OFFSET ?
      `;
      const rows = db.prepare(dataQuery).all(...params, limit, offset);

      return jsonResponse(
        {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          items: rows,
        },
        200,
        req
      );
    }

    // Endpoint 9: Single Transaction Details for Drawer (Explicit projection & PII masking)
    if (url.pathname.startsWith("/api/transactions/")) {
      const id = url.pathname.split("/").pop();
      const query = `
        SELECT 
          f.transaction_id,
          f.order_id,
          f.order_date,
          f.store_id,
          f.product_id,
          f.customer_id,
          f.quantity,
          f.unit_price,
          f.unit_cost,
          f.discount_pct,
          f.discount_amount,
          f.net_revenue,
          f.total_cost,
          f.gross_profit,
          f.shipping_cost,
          s.store_name, s.city, s.state as store_state, s.region, s.store_type,
          p.product_name, p.category, p.sub_category,
          c.first_name, c.last_name,
          CASE 
            WHEN c.email LIKE '%@%' THEN 
              substr(c.email, 1, 2) || '***@' || substr(c.email, instr(c.email, '@') + 1)
            ELSE '***'
          END AS email,
          c.segment as customer_segment, 
          c.state as customer_state
        FROM fact_transactions f
        JOIN dim_stores s ON f.store_id = s.store_id
        JOIN dim_products p ON f.product_id = p.product_id
        JOIN dim_customers c ON f.customer_id = c.customer_id
        WHERE f.transaction_id = ? OR f.order_id = ?
        LIMIT 1
      `;
      const item = db.prepare(query).get(id, id);
      if (!item) {
        return jsonResponse({ error: "Transaction not found" }, 404, req);
      }
      return jsonResponse(item, 200, req);
    }

    // Endpoint 10: API 404 Guard (prevents API routes from falling through to HTML SPA fallback)
    if (url.pathname.startsWith("/api/")) {
      return jsonError("API Endpoint Not Found", 404, url.pathname, req);
    }

    // Endpoint 11: Serve Frontend Static Build (Production SPA Fallback)
    if (existsSync(DIST_DIR)) {
      const indexHtml = path.join(DIST_DIR, "index.html");
      if (url.pathname !== "/") {
        const requestedFile = path.join(DIST_DIR, url.pathname);
        if (existsSync(requestedFile) && statSync(requestedFile).isFile()) {
          return new Response(Bun.file(requestedFile));
        }
      }
      if (existsSync(indexHtml)) {
        return new Response(Bun.file(indexHtml), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }

    return jsonError("Not Found", 404, url.pathname, req);
  } catch (err: unknown) {
    console.error(`[Retail API Error] ${req.method} ${url.pathname}:`, err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 500, url.pathname, req);
  }
}
