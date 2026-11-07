-- =============================================================================
-- RETAIL ANALYTICS - COMPLEX ANALYTICAL SQL QUERIES
-- Dialect: SQLite / Bun SQLite Native (ANSI SQL & Window Function Standard)
-- Utilizes: Common Table Expressions (CTEs), Window Functions, Robust Edge Cases
-- =============================================================================

-- =============================================================================
-- QUERY 1: Month-over-Month (MoM) Revenue Growth % and Running Year-to-Date (YTD)
--          Revenue by Geographic Region
-- =============================================================================
-- Business Purpose:
-- Evaluates sales momentum across commercial territories. Identifies sudden drops
-- or accelerations in demand while tracking progress against annual regional targets.
--
-- Note on Window Lag:
-- Evaluates consecutive active sales periods for each territory. For strict calendar
-- continuity without data gaps, calendar dimension cross-joins can pre-fill zero-sales periods.
-- -----------------------------------------------------------------------------

WITH monthly_regional_revenue AS (
    -- Step 1: Aggregate net revenue, profit, and volume by region, year, and month
    SELECT
        s.region,
        c.year,
        c.month,
        c.month_short,
        c.month_name,
        c.year || '-' || printf('%02d', c.month) AS period,
        ROUND(SUM(f.net_revenue), 2)  AS monthly_revenue,
        ROUND(SUM(f.gross_profit), 2) AS monthly_profit,
        SUM(f.quantity)               AS units_sold,
        COUNT(DISTINCT f.order_id)    AS order_count
    FROM fact_transactions f
    INNER JOIN dim_stores s
        ON f.store_id = s.store_id
    INNER JOIN dim_calendar c
        ON f.date_key = c.date_key
    GROUP BY
        s.region,
        c.year,
        c.month,
        c.month_short,
        c.month_name
),
windowed_growth_and_ytd AS (
    -- Step 2: Use window functions for prior month lag and cumulative annual sum
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
        -- Prior month revenue for the same region
        LAG(monthly_revenue, 1) OVER (
            PARTITION BY region 
            ORDER BY year, month
        ) AS prev_month_revenue,
        -- Running Year-to-Date (YTD) Revenue reset at each fiscal/calendar year boundary
        SUM(monthly_revenue) OVER (
            PARTITION BY region, year 
            ORDER BY month 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_ytd_revenue
    FROM monthly_regional_revenue
)
-- Step 3: Compute MoM percentage change and format final output matching RevenueTrendRow
SELECT
    region,
    year,
    month,
    month_short,
    month_name,
    period,
    monthly_revenue,
    monthly_profit,
    COALESCE(prev_month_revenue, 0.00) AS prev_month_revenue,
    -- Handle edge cases (first month nulls or zero division) with NULLIF
    ROUND(
        100.0 * (monthly_revenue - prev_month_revenue) / NULLIF(prev_month_revenue, 0),
        2
    ) AS mom_growth_pct,
    running_ytd_revenue,
    units_sold,
    order_count
FROM windowed_growth_and_ytd
ORDER BY
    region ASC,
    year ASC,
    month ASC;


-- =============================================================================
-- QUERY 2: Top 10 Stores Ranked by Profit Margin and Total Volume Sold
-- =============================================================================
-- Business Purpose:
-- Identifies top-performing store locations by evaluating profitability efficiency
-- (Profit Margin %) alongside operational sales throughput (Volume Sold).
-- Output directly aligns with the TopStoreRow interface contract.
-- -----------------------------------------------------------------------------

WITH store_financial_totals AS (
    -- Step 1: Aggregate revenue, cost, profit, and unit volume per retail location
    SELECT
        s.store_id,
        s.store_name,
        s.city,
        s.state,
        s.region,
        s.store_type,
        s.square_footage,
        SUM(f.quantity)              AS total_volume_sold,
        COUNT(DISTINCT f.order_id)   AS total_orders,
        ROUND(SUM(f.net_revenue), 2) AS total_revenue,
        ROUND(SUM(f.total_cost), 2)  AS total_cost,
        ROUND(SUM(f.gross_profit), 2) AS total_profit
    FROM fact_transactions f
    INNER JOIN dim_stores s
        ON f.store_id = s.store_id
    GROUP BY
        s.store_id,
        s.store_name,
        s.city,
        s.state,
        s.region,
        s.store_type,
        s.square_footage
),
store_metrics AS (
    -- Step 2: Compute margin percentage and sales density per square foot
    SELECT
        store_id,
        store_name,
        city,
        state,
        region,
        store_type,
        square_footage,
        total_volume_sold,
        total_orders,
        total_revenue,
        total_cost,
        total_profit,
        ROUND(
            100.0 * total_profit / NULLIF(total_revenue, 0),
            2
        ) AS profit_margin_pct,
        ROUND(
            total_revenue / NULLIF(square_footage, 0),
            2
        ) AS revenue_per_sqft
    FROM store_financial_totals
),
ranked_stores AS (
    -- Step 3: Compute window rankings for both margin and volume throughput
    SELECT
        store_id,
        store_name,
        city,
        state,
        region,
        store_type,
        square_footage,
        total_volume_sold,
        total_orders,
        total_revenue,
        total_cost,
        total_profit,
        profit_margin_pct,
        revenue_per_sqft,
        DENSE_RANK() OVER (ORDER BY profit_margin_pct DESC)    AS margin_rank,
        DENSE_RANK() OVER (ORDER BY total_volume_sold DESC)    AS volume_rank,
        ROW_NUMBER() OVER (
            ORDER BY profit_margin_pct DESC, total_volume_sold DESC
        ) AS primary_rank
    FROM store_metrics
)
-- Step 4: Extract top 10 stores (including square_footage and total_cost)
SELECT
    primary_rank,
    store_id,
    store_name,
    city,
    state,
    region,
    store_type,
    square_footage,
    total_volume_sold,
    total_orders,
    total_revenue,
    total_cost,
    total_profit,
    profit_margin_pct,
    revenue_per_sqft,
    margin_rank,
    volume_rank
FROM ranked_stores
WHERE primary_rank <= 10
ORDER BY primary_rank ASC;


-- =============================================================================
-- QUERY 3: Customer Segmentation Analysis (RFM: Recency, Frequency, Monetary)
-- =============================================================================
-- Business Purpose:
-- Computes Recency, Frequency, and Monetary scores across 10,000 customers.
-- Categorizes each customer into actionable marketing segments with strict
-- condition precedence (Recent Customers & Cannot Lose Them evaluated before broad bounds).
-- -----------------------------------------------------------------------------

WITH reference_snapshot AS (
    -- Anchor date: maximum date in fact dataset + 1 day (SQLite / ANSI compatible)
    SELECT date(MAX(order_date), '+1 day') AS snapshot_date
    FROM fact_transactions
),
customer_rfm_raw AS (
    -- Step 1: Calculate raw Recency, Frequency, and Monetary metrics per customer
    SELECT
        c.customer_id,
        c.first_name || ' ' || c.last_name AS customer_name,
        c.segment                          AS customer_profile,
        c.state,
        -- Recency: Days elapsed between anchor snapshot and customer's latest order
        CAST(julianday((SELECT snapshot_date FROM reference_snapshot)) - julianday(MAX(f.order_date)) AS INTEGER) AS recency_days,
        -- Frequency: Total distinct orders placed
        COUNT(DISTINCT f.order_id)         AS frequency,
        -- Monetary: Total lifetime net revenue generated
        ROUND(SUM(f.net_revenue), 2)       AS monetary
    FROM dim_customers c
    INNER JOIN fact_transactions f
        ON c.customer_id = f.customer_id
    GROUP BY
        c.customer_id,
        c.first_name,
        c.last_name,
        c.segment,
        c.state
),
rfm_quintiles AS (
    -- Step 2: Assign scores from 1 to 5 using NTILE window functions
    -- For Recency: Lower days = Higher Score (score 5 = most recent)
    -- For Frequency & Monetary: Higher value = Higher Score (score 5 = highest)
    SELECT
        customer_id,
        customer_name,
        customer_profile,
        state,
        recency_days,
        frequency,
        monetary,
        NTILE(5) OVER (ORDER BY recency_days DESC) AS r_score,
        NTILE(5) OVER (ORDER BY frequency ASC)    AS f_score,
        NTILE(5) OVER (ORDER BY monetary ASC)     AS m_score
    FROM customer_rfm_raw
),
customer_segmentation AS (
    -- Step 3: Categorize customers into actionable business segments
    SELECT
        customer_id,
        customer_name,
        customer_profile,
        state,
        recency_days,
        frequency,
        monetary,
        r_score,
        f_score,
        m_score,
        (r_score * 100 + f_score * 10 + m_score) AS rfm_combined_score,
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
    FROM rfm_quintiles
)
-- Step 4: Executive Segment Performance Rollup (Distribution & Revenue Share)
SELECT
    rfm_segment,
    COUNT(*)                                                         AS total_customers,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM dim_customers), 2) AS customer_share_pct,
    ROUND(AVG(recency_days), 1)                                      AS avg_recency_days,
    ROUND(AVG(frequency), 2)                                         AS avg_order_count,
    ROUND(AVG(monetary), 2)                                          AS avg_monetary_spend,
    ROUND(SUM(monetary), 2)                                          AS total_segment_revenue,
    ROUND(100.0 * SUM(monetary) / (SELECT SUM(net_revenue) FROM fact_transactions), 2) AS revenue_contribution_pct
FROM customer_segmentation
GROUP BY rfm_segment
ORDER BY total_segment_revenue DESC;
