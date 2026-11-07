export interface OverviewKPIs {
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin_pct: number;
  total_orders: number;
  total_units_sold: number;
  active_customers: number;
  average_order_value: number;
  avg_discount_pct: number;
  mom_growth_pct: number | null;
  current_month_revenue: number;
  prior_month_revenue: number;
}

export interface RevenueTrendRow {
  region: string;
  year: number;
  month: number;
  month_short: string;
  month_name: string;
  period: string;
  monthly_revenue: number;
  monthly_profit?: number;
  prev_month_revenue?: number;
  mom_growth_pct?: number | null;
  running_ytd_revenue?: number;
  units_sold: number;
  order_count: number;
}

export interface TopStoreRow {
  primary_rank: number;
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  store_type: string;
  square_footage: number;
  total_volume_sold: number;
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  profit_margin_pct: number;
  revenue_per_sqft: number;
  margin_rank: number;
  volume_rank: number;
}

export interface RFMSegmentRow {
  rfm_segment: string;
  total_customers: number;
  customer_share_pct: number;
  avg_recency_days: number;
  avg_order_count: number;
  avg_monetary_spend: number;
  total_segment_revenue: number;
  revenue_contribution_pct: number;
}

export interface CategoryFinancialRow {
  category: string;
  sub_category: string;
  total_revenue: number;
  total_cost?: number;
  gross_profit: number;
  profit_margin_pct: number;
  total_units_sold?: number;
  units_sold?: number;
  total_orders?: number;
  order_count?: number;
  avg_discount_pct?: number;
}

export interface TransactionItem {
  transaction_id: string;
  order_id: string;
  order_date: string;
  store_id: string;
  store_name: string;
  city?: string;
  region: string;
  product_id: string;
  product_name: string;
  category: string;
  sub_category: string;
  customer_id: string;
  customer_name: string;
  customer_segment: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount_pct: number;
  net_revenue: number;
  total_cost: number;
  gross_profit: number;
  profit_margin_pct: number;
  shipping_cost: number;
}

export interface PaginatedTransactions {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: TransactionItem[];
}

export interface StoreOption {
  store_id: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  store_type: string;
  square_footage: number;
}

