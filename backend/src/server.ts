import { db, initDatabaseSchema } from "./db";
import path from "path";
import { existsSync, statSync } from "fs";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = process.env.DIST_DIR || path.resolve(__dirname, "../../frontend/dist");

initDatabaseSchema();

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3001"
)
  .split(",")
  .map((s) => s.trim());

function getCorsHeaders(req?: Request): Record<string, string> {
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

function jsonResponse(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(req),
    },
  });
}

function jsonError(message: string, status = 500, path?: string, req?: Request) {
  return new Response(JSON.stringify({
    ok: false,
    error: message,
    path,
    timestamp: new Date().toISOString(),
  }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(req),
    },
  });
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: getCorsHeaders(req),
      });
    }

    try {
      // 1. Health check
      if (url.pathname === "/api/health") {
        const stats = db.query(`
          SELECT 
            (SELECT COUNT(*) FROM fact_transactions) as transactions,
            (SELECT COUNT(*) FROM dim_stores) as stores,
            (SELECT COUNT(*) FROM dim_products) as products,
            (SELECT COUNT(*) FROM dim_customers) as customers
        `).get() as Record<string, number>;

        return jsonResponse({
          status: "healthy",
          server: "Bun + Native SQLite",
          counts: stats,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Executive Overview KPIs
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

        const query = `
          SELECT 
            ROUND(SUM(f.net_revenue), 2) AS total_revenue,
            ROUND(SUM(f.total_cost), 2) AS total_cost,
            ROUND(SUM(f.gross_profit), 2) AS gross_profit,
            ROUND(100.0 * SUM(f.gross_profit) / NULLIF(SUM(f.net_revenue), 0), 2) AS profit_margin_pct,
            COUNT(DISTINCT f.order_id) AS total_orders,
            SUM(f.quantity) AS total_units_sold,
            COUNT(DISTINCT f.customer_id) AS active_customers,
            ROUND(SUM(f.net_revenue) / NULLIF(COUNT(DISTINCT f.order_id), 0), 2) AS average_order_value,
            ROUND(100.0 * SUM(f.discount_amount) / NULLIF(SUM(f.net_revenue + f.discount_amount), 0), 2) AS avg_discount_pct
          FROM fact_transactions f
          JOIN dim_stores s ON f.store_id = s.store_id
          JOIN dim_products p ON f.product_id = p.product_id
          WHERE ${filterClause}
        `;
        const kpis = db.prepare(query).get(...params) as Record<string, number>;

        // MoM comparison for latest 2 months
        const momQuery = `
          WITH monthly AS (
            SELECT 
              c.year, 
              c.month,
              ROUND(SUM(f.net_revenue), 2) as revenue
            FROM fact_transactions f
            JOIN dim_calendar c ON f.date_key = c.date_key
            JOIN dim_stores s ON f.store_id = s.store_id
            JOIN dim_products p ON f.product_id = p.product_id
            WHERE ${filterClause}
            GROUP BY c.year, c.month
            ORDER BY c.year DESC, c.month DESC
            LIMIT 2
          )
          SELECT 
            m1.revenue as current_month_revenue,
            m2.revenue as prior_month_revenue,
            ROUND(100.0 * (m1.revenue - m2.revenue) / NULLIF(m2.revenue, 0), 2) as mom_growth_pct
          FROM (SELECT * FROM monthly LIMIT 1) m1
          LEFT JOIN (SELECT * FROM monthly LIMIT 1 OFFSET 1) m2 ON 1=1
        `;
        const mom = db.prepare(momQuery).get(...params) as Record<string, number> | null;

        return jsonResponse({
          ...kpis,
          mom_growth_pct: mom?.mom_growth_pct ?? null,
          current_month_revenue: mom?.current_month_revenue ?? 0,
          prior_month_revenue: mom?.prior_month_revenue ?? 0,
        }, 200, req);
      }

      // 3. Query 1: Revenue Trends (MoM Growth & Running YTD by Region)
      if (url.pathname === "/api/revenue-trend") {
        const region = url.searchParams.get("region");
        let filter = "";
        const params: (string | number)[] = [];

        if (region && region !== "All") {
          filter = "WHERE s.region = ?";
          params.push(region);
        }

        const query = `
          WITH monthly_regional AS (
            SELECT 
              s.region,
              c.year,
              c.month,
              c.month_short,
              c.month_name,
              c.year || '-' || printf('%02d', c.month) as period,
              ROUND(SUM(f.net_revenue), 2) AS monthly_revenue,
              ROUND(SUM(f.gross_profit), 2) AS monthly_profit,
              SUM(f.quantity) AS units_sold,
              COUNT(DISTINCT f.order_id) AS order_count
            FROM fact_transactions f
            JOIN dim_stores s ON f.store_id = s.store_id
            JOIN dim_calendar c ON f.date_key = c.date_key
            ${filter}
            GROUP BY s.region, c.year, c.month, c.month_short, c.month_name
          ),
          windowed AS (
            SELECT 
              region,
              year,
              month,
              month_short,
              month_name,
              period,
              monthly_revenue,
              monthly_profit,
              units_sold,
              order_count,
              LAG(monthly_revenue, 1) OVER (PARTITION BY region ORDER BY year, month) AS prev_month_revenue,
              SUM(monthly_revenue) OVER (
                PARTITION BY region, year 
                ORDER BY month 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
              ) AS running_ytd_revenue
            FROM monthly_regional
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
            COALESCE(prev_month_revenue, 0) AS prev_month_revenue,
            ROUND(100.0 * (monthly_revenue - prev_month_revenue) / NULLIF(prev_month_revenue, 0), 2) AS mom_growth_pct,
            running_ytd_revenue,
            units_sold,
            order_count
          FROM windowed
          ORDER BY year ASC, month ASC, region ASC
        `;
        const rows = db.prepare(query).all(...params);
        return jsonResponse(rows);
      }

      // 4. Query 2: Top Stores Ranked by Margin & Volume
      if (url.pathname === "/api/stores/top") {
        const limit = Number(url.searchParams.get("limit") || 10);
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
        return jsonResponse(rows);
      }

      // 5. Query 3: Customer Segmentation (RFM Analysis)
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
                WHEN r_score >= 4 AND f_score = 1 THEN 'Recent Customers'
                WHEN r_score >= 4 AND f_score <= 3 THEN 'Potential Loyalists'
                WHEN r_score <= 2 AND f_score >= 3 AND m_score >= 3 THEN 'At Risk'
                WHEN r_score = 1 AND f_score >= 4 THEN 'Cannot Lose Them'
                WHEN r_score <= 2 AND f_score <= 2 THEN 'Hibernating / Lost'
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
        return jsonResponse(segmentsResult);
      }

      // 6. Category Financial Breakdown
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
            COUNT(DISTINCT f.order_id) AS order_count
          FROM fact_transactions f
          JOIN dim_products p ON f.product_id = p.product_id
          GROUP BY p.category, p.sub_category
          ORDER BY total_revenue DESC
        `;
        const categoriesResult = db.prepare(query).all();
        return jsonResponse(categoriesResult);
      }

      // 7. Store List for Filters
      if (url.pathname === "/api/stores") {
        const query = `
          SELECT store_id, store_name, city, state, region, store_type, square_footage 
          FROM dim_stores 
          ORDER BY region, city
        `;
        const stores = db.prepare(query).all();
        return jsonResponse(stores);
      }

      // 8. Transactions Explorer Table (Searchable & Paginated)
      if (url.pathname === "/api/transactions") {
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 15)));
        const search = url.searchParams.get("search") || "";
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
        const total = countRes.total;

        const offset = (page - 1) * limit;
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

        return jsonResponse({
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          items: rows,
        });
      }

      // 9. Single Transaction Details for Drawer
      if (url.pathname.startsWith("/api/transactions/")) {
        const id = url.pathname.split("/").pop();
        const query = `
          SELECT 
            f.*,
            s.store_name, s.city, s.state as store_state, s.region, s.store_type,
            p.product_name, p.category, p.sub_category,
            c.first_name, c.last_name, c.email, c.segment as customer_segment, c.state as customer_state
          FROM fact_transactions f
          JOIN dim_stores s ON f.store_id = s.store_id
          JOIN dim_products p ON f.product_id = p.product_id
          JOIN dim_customers c ON f.customer_id = c.customer_id
          WHERE f.transaction_id = ? OR f.order_id = ?
          LIMIT 1
        `;
        const item = db.prepare(query).get(id, id);
        if (!item) {
          return jsonResponse({ error: "Transaction not found" }, 404);
        }
        return jsonResponse(item);
      }

      // 10. API 404 Guard (prevents API routes from falling through to HTML SPA fallback)
      if (url.pathname.startsWith("/api/")) {
        return jsonError("API Endpoint Not Found", 404, url.pathname);
      }

      // 11. Serve Frontend Static Build (Production SPA Fallback)
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

      return jsonError("Not Found", 404, url.pathname);
    } catch (err: unknown) {
      console.error(`[Retail API Error] ${req.method} ${url.pathname}:`, err);
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(msg, 500, url.pathname);
    }
  },
});

console.log(`🚀 Retail Analytics Full-Stack App running on http://localhost:${PORT}`);
