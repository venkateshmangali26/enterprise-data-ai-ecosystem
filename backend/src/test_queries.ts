import { db } from "./db";

console.log("Testing DB Queries...");
const overview = db.query(`
  SELECT 
    COUNT(*) as total_txns, 
    ROUND(SUM(net_revenue), 2) as total_rev, 
    ROUND(SUM(gross_profit), 2) as total_profit,
    ROUND(100.0 * SUM(gross_profit) / SUM(net_revenue), 2) as margin_pct
  FROM fact_transactions
`).get();
console.log("Overview:", overview);

const topStores = db.query(`
  SELECT 
    s.store_name, s.region,
    ROUND(SUM(f.net_revenue), 2) as revenue,
    ROUND(100.0 * SUM(f.gross_profit) / SUM(f.net_revenue), 2) as margin_pct
  FROM fact_transactions f
  JOIN dim_stores s ON f.store_id = s.store_id
  GROUP BY s.store_name, s.region
  ORDER BY margin_pct DESC
  LIMIT 3
`).all();
console.log("Top Stores by Margin:", topStores);

