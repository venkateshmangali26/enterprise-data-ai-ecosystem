"""
================================================================================
SYNTHETIC RETAIL E-COMMERCE DATASET GENERATOR (STAR SCHEMA)
================================================================================
Author: Senior Data Engineer
Target: 500,000 transaction rows across a clean Star Schema
Tables Generated:
  1. Dim_Stores (38 stores across regions, cities, and store types)
  2. Dim_Products (250 products across 5 categories with realistic margins)
  3. Dim_Customers (10,000 customers across segments, states, and signup dates)
  4. Dim_Calendar (Date dimension spanning 3 full years: 2023-01-01 to 2025-12-31)
  5. Fact_Transactions (500,000 sales transactions with realistic seasonal spikes)

HOW TO RUN THIS SCRIPT:
-----------------------
1. Ensure Python 3.9+ is installed with pandas and numpy:
     pip install pandas numpy
2. Run the script:
     python generate_data.py
3. The generated CSV files will be saved in the './data/' folder:
     - ./data/Dim_Stores.csv
     - ./data/Dim_Products.csv
     - ./data/Dim_Customers.csv
     - ./data/Dim_Calendar.csv
     - ./data/Fact_Transactions.csv
================================================================================
"""

import os
import time
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Set random seed for deterministic and reproducible generation
SEED = 42
np.random.seed(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ==============================================================================
# 1. DIM_STORES GENERATION (38 Stores)
# ==============================================================================
def generate_dim_stores() -> pd.DataFrame:
    """
    Generates 38 retail stores spread across 4 geographic regions:
    East, West, Midwest, South, with realistic store formats and square footage.
    """
    print("[1/5] Generating Dim_Stores (38 stores)...")

    store_locations = [
        # East Region
        ("New York", "NY", "East", "Flagship", 45000),
        ("Boston", "MA", "East", "Standard", 22000),
        ("Philadelphia", "PA", "East", "Standard", 25000),
        ("Pittsburgh", "PA", "East", "Mall", 18000),
        ("Baltimore", "MD", "East", "Express", 9500),
        ("Newark", "NJ", "East", "Outlet", 32000),
        ("Hartford", "CT", "East", "Express", 8500),
        ("Providence", "RI", "East", "Mall", 16000),
        ("Buffalo", "NY", "East", "Outlet", 28000),
        # West Region
        ("Los Angeles", "CA", "West", "Flagship", 52000),
        ("San Francisco", "CA", "West", "Flagship", 38000),
        ("Seattle", "WA", "West", "Standard", 26000),
        ("Portland", "OR", "West", "Standard", 21000),
        ("San Diego", "CA", "West", "Standard", 24000),
        ("San Jose", "CA", "West", "Mall", 19500),
        ("Phoenix", "AZ", "West", "Outlet", 34000),
        ("Denver", "CO", "West", "Standard", 25000),
        ("Las Vegas", "NV", "West", "Outlet", 36000),
        ("Salt Lake City", "UT", "West", "Express", 9000),
        # Midwest Region
        ("Chicago", "IL", "Midwest", "Flagship", 48000),
        ("Detroit", "MI", "Midwest", "Standard", 23000),
        ("Minneapolis", "MN", "Midwest", "Standard", 22500),
        ("Cleveland", "OH", "Midwest", "Mall", 17500),
        ("Columbus", "OH", "Midwest", "Standard", 20000),
        ("Indianapolis", "IN", "Midwest", "Standard", 19000),
        ("Milwaukee", "WI", "Midwest", "Outlet", 29000),
        ("Kansas City", "MO", "Midwest", "Mall", 18500),
        ("St. Louis", "MO", "Midwest", "Outlet", 31000),
        # South Region
        ("Dallas", "TX", "South", "Flagship", 50000),
        ("Houston", "TX", "South", "Flagship", 46000),
        ("Austin", "TX", "South", "Standard", 24000),
        ("Atlanta", "GA", "South", "Flagship", 42000),
        ("Miami", "FL", "South", "Standard", 28000),
        ("Orlando", "FL", "South", "Outlet", 35000),
        ("Charlotte", "NC", "South", "Standard", 22000),
        ("Nashville", "TN", "South", "Mall", 19000),
        ("New Orleans", "LA", "South", "Express", 8800),
        ("Tampa", "FL", "South", "Mall", 20500),
    ]

    stores_data = []
    base_opening_date = datetime(2015, 1, 1)

    for idx, (city, state, region, store_type, sqft) in enumerate(store_locations, start=1):
        store_id = f"STR-{idx:03d}"
        store_name = f"{city} {store_type} Store"
        # Deterministic opening date
        opening_offset_days = (idx * 97) % 2500
        open_date = (base_opening_date + timedelta(days=opening_offset_days)).strftime("%Y-%m-%d")

        stores_data.append({
            "Store_ID": store_id,
            "Store_Name": store_name,
            "City": city,
            "State": state,
            "Region": region,
            "Store_Type": store_type,
            "Square_Footage": sqft,
            "Opening_Date": open_date,
            "Is_Active": True
        })

    df_stores = pd.DataFrame(stores_data)
    return df_stores


# ==============================================================================
# 2. DIM_PRODUCTS GENERATION (250 Products across 5 Categories)
# ==============================================================================
def generate_dim_products() -> pd.DataFrame:
    """
    Generates 250 products across 5 distinct categories:
    Electronics, Apparel, Home & Kitchen, Sports, Beauty.
    Applies category-specific cost and retail price bands with realistic margins.
    """
    print("[2/5] Generating Dim_Products (250 products)...")

    category_config = {
        "Electronics": {
            "subcategories": ["Smartphones", "Audio", "Laptops & Tablets", "Wearables", "Accessories"],
            "count": 55,
            "cost_range": (35.0, 950.0),
            "margin_range": (0.18, 0.35),  # 18% - 35% margin
            "prefixes": ["Pro", "Ultra", "Max", "Elite", "Prime", "Quantum", "Pulse"]
        },
        "Apparel": {
            "subcategories": ["Men's Wear", "Women's Wear", "Footwear", "Outerwear", "Athletic Apparel"],
            "count": 60,
            "cost_range": (8.0, 85.0),
            "margin_range": (0.45, 0.68),  # 45% - 68% margin
            "prefixes": ["Classic", "Comfort", "Signature", "Heritage", "Modern", "Essential"]
        },
        "Home & Kitchen": {
            "subcategories": ["Cookware", "Small Appliances", "Bedding", "Decor", "Storage"],
            "count": 50,
            "cost_range": (12.0, 180.0),
            "margin_range": (0.40, 0.60),  # 40% - 60% margin
            "prefixes": ["Artisan", "Culinary", "EcoHome", "Pure", "ComfortCraft", "Haven"]
        },
        "Sports": {
            "subcategories": ["Fitness Equipment", "Outdoor Gear", "Team Sports", "Cycling", "Yoga & Recovery"],
            "count": 45,
            "cost_range": (10.0, 240.0),
            "margin_range": (0.35, 0.55),  # 35% - 55% margin
            "prefixes": ["Apex", "Velocity", "Summit", "Dynamic", "ProForm", "Endurance"]
        },
        "Beauty": {
            "subcategories": ["Skincare", "Haircare", "Fragrance", "Makeup", "Bath & Body"],
            "count": 40,
            "cost_range": (5.0, 65.0),
            "margin_range": (0.55, 0.80),  # 55% - 80% margin
            "prefixes": ["Radiance", "Luxe", "Botanical", "Glow", "Derma", "Silk"]
        }
    }

    products_data = []
    prod_counter = 1

    for category, cfg in category_config.items():
        subcats = cfg["subcategories"]
        for i in range(cfg["count"]):
            prod_id = f"PRD-{prod_counter:04d}"
            subcat = subcats[i % len(subcats)]
            prefix = cfg["prefixes"][i % len(cfg["prefixes"])]
            prod_name = f"{prefix} {subcat.rstrip('s')} Item {i+1}"

            # Calculate cost and retail price
            cost = round(np.random.uniform(cfg["cost_range"][0], cfg["cost_range"][1]), 2)
            margin = np.random.uniform(cfg["margin_range"][0], cfg["margin_range"][1])
            retail_price = round(cost / (1.0 - margin), 2)

            products_data.append({
                "Product_ID": prod_id,
                "Product_Name": prod_name,
                "Category": category,
                "Sub_Category": subcat,
                "Unit_Cost": cost,
                "Retail_Price": retail_price
            })
            prod_counter += 1

    df_products = pd.DataFrame(products_data)
    return df_products


# ==============================================================================
# 3. DIM_CUSTOMERS GENERATION (10,000 Customers)
# ==============================================================================
def generate_dim_customers() -> pd.DataFrame:
    """
    Generates 10,000 customer records with realistic customer segments,
    signup dates from 2020 through 2024, and geographic distribution.
    """
    print("[3/5] Generating Dim_Customers (10,000 customers)...")
    num_customers = 10000

    first_names = [
        "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
        "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
        "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
        "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
        "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle"
    ]
    last_names = [
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
        "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
        "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
    ]

    states = [
        "CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI",
        "NJ", "VA", "WA", "AZ", "TN", "MA", "IN", "MO", "MD", "CO"
    ]
    state_weights = [
        0.12, 0.10, 0.08, 0.08, 0.05, 0.05, 0.04, 0.04, 0.04, 0.04,
        0.04, 0.03, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.06
    ]

    segments = ["Consumer", "Corporate", "Home Office"]
    segment_weights = [0.65, 0.25, 0.10]

    chosen_first = np.random.choice(first_names, size=num_customers)
    chosen_last = np.random.choice(last_names, size=num_customers)
    chosen_states = np.random.choice(states, size=num_customers, p=state_weights)
    chosen_segments = np.random.choice(segments, size=num_customers, p=segment_weights)

    # Generate signup dates between 2020-01-01 and 2024-12-31
    start_signup = datetime(2020, 1, 1)
    end_signup = datetime(2024, 12, 31)
    signup_span_days = (end_signup - start_signup).days
    random_days = np.random.randint(0, signup_span_days + 1, size=num_customers)
    signup_dates = [start_signup + timedelta(days=int(d)) for d in random_days]

    customers_data = []
    for idx in range(num_customers):
        cust_id = f"CUST-{idx+1:06d}"
        fn = chosen_first[idx]
        ln = chosen_last[idx]
        domain = "example.com" if chosen_segments[idx] == "Consumer" else "corp-retail.org"
        email = f"{fn.lower()}.{ln.lower()}{idx+1}@{domain}"
        zip_code = f"{np.random.randint(10000, 99999)}"

        customers_data.append({
            "Customer_ID": cust_id,
            "First_Name": fn,
            "Last_Name": ln,
            "Email": email,
            "Segment": chosen_segments[idx],
            "State": chosen_states[idx],
            "Postal_Code": zip_code,
            "Signup_Date": signup_dates[idx].strftime("%Y-%m-%d")
        })

    df_customers = pd.DataFrame(customers_data)
    return df_customers


# ==============================================================================
# 4. DIM_CALENDAR GENERATION (3 Years: 2023-01-01 to 2025-12-31)
# ==============================================================================
def generate_dim_calendar() -> pd.DataFrame:
    """
    Generates a full date dimension table for 3 calendar years (2023 - 2025).
    Includes calendar keys, month, quarter, year, weekend indicators, and fiscal quarters.
    """
    print("[4/5] Generating Dim_Calendar (3 full years: 2023-2025)...")
    start_date = pd.Timestamp("2023-01-01")
    end_date = pd.Timestamp("2025-12-31")
    dates = pd.date_range(start_date, end_date, freq="D")

    calendar_df = pd.DataFrame({"Date": dates})
    calendar_df["Date_Key"] = calendar_df["Date"].dt.strftime("%Y%m%d").astype(int)
    calendar_df["Date"] = calendar_df["Date"].dt.strftime("%Y-%m-%d")
    calendar_df["Year"] = dates.year
    calendar_df["Quarter"] = dates.quarter
    calendar_df["Quarter_Name"] = "Q" + dates.quarter.astype(str) + " " + dates.year.astype(str)
    calendar_df["Month"] = dates.month
    calendar_df["Month_Name"] = dates.strftime("%B")
    calendar_df["Month_Short"] = dates.strftime("%b")
    calendar_df["Day"] = dates.day
    calendar_df["Day_Of_Week"] = dates.dayofweek + 1  # 1 = Monday, 7 = Sunday
    calendar_df["Day_Name"] = dates.strftime("%A")
    calendar_df["Is_Weekend"] = dates.dayofweek.isin([5, 6])  # Saturday & Sunday

    # Fiscal Year (Assuming standard Retail 4-5-4 or Fiscal start Feb 1)
    calendar_df["Fiscal_Quarter"] = np.where(
        dates.month.isin([2, 3, 4]), "FQ1",
        np.where(dates.month.isin([5, 6, 7]), "FQ2",
        np.where(dates.month.isin([8, 9, 10]), "FQ3", "FQ4"))
    )
    calendar_df["Fiscal_Year"] = np.where(dates.month >= 2, dates.year, dates.year - 1)

    return calendar_df


# ==============================================================================
# 5. FACT_TRANSACTIONS GENERATION (500,000 Rows with Realistic Seasonality)
# ==============================================================================
def generate_fact_transactions(
    df_stores: pd.DataFrame,
    df_products: pd.DataFrame,
    df_customers: pd.DataFrame,
    df_calendar: pd.DataFrame,
    total_rows: int = 500000
) -> pd.DataFrame:
    """
    Generates 500,000 transaction records linking to all 4 dimensions.
    Features:
      - Realistic Seasonal Spikes: Q4 Holiday surge (Nov/Dec +120%), Summer bump (July +30%)
      - Weekend demand boosts (+40% on Sat/Sun)
      - Customer Pareto distribution (repeat loyal customers vs single purchases)
      - Dynamic product pricing, bulk discounts, and shipping cost calculations
    """
    print(f"[5/5] Generating Fact_Transactions ({total_rows:,} rows with seasonal spikes)...")

    # 1. Create a daily probability weight based on seasonality and weekend
    calendar_dates = pd.to_datetime(df_calendar["Date"])
    base_weights = np.ones(len(df_calendar))

    # Month seasonality multipliers
    month_multipliers = {
        1: 0.75,   # Post-holiday slump
        2: 0.80,
        3: 0.95,   # Spring recovery
        4: 0.90,
        5: 1.00,
        6: 1.05,
        7: 1.25,   # Mid-year / Summer sale
        8: 1.10,   # Back to school
        9: 0.95,
        10: 1.15,  # Pre-holiday runup
        11: 2.10,  # Black Friday / Cyber Month
        12: 2.45   # Christmas / Holiday Peak
    }

    for idx, dt in enumerate(calendar_dates):
        # Month weight
        w = month_multipliers[dt.month]
        # Weekend boost (Saturday = 5, Sunday = 6)
        if dt.dayofweek in [5, 6]:
            w *= 1.40
        # Extra Black Friday boost (Late November)
        if dt.month == 11 and dt.day >= 22 and dt.day <= 29:
            w *= 1.80
        # Extra Christmas Eve boost (Dec 15 - Dec 23)
        if dt.month == 12 and dt.day >= 15 and dt.day <= 23:
            w *= 1.50

        base_weights[idx] = w

    # Normalize weights to probability distribution
    date_probs = base_weights / base_weights.sum()

    # Sample transaction dates
    sampled_date_indices = np.random.choice(len(df_calendar), size=total_rows, p=date_probs)
    sampled_dates = df_calendar["Date"].iloc[sampled_date_indices].values
    sampled_date_keys = df_calendar["Date_Key"].iloc[sampled_date_indices].values

    # 2. Store Selection: Weight by store format / square footage
    store_ids = df_stores["Store_ID"].values
    store_sqft = df_stores["Square_Footage"].values
    store_probs = store_sqft / store_sqft.sum()
    sampled_store_ids = np.random.choice(store_ids, size=total_rows, p=store_probs)

    # 3. Product Selection: Weight by category volume (Apparel & Beauty sell more units than Electronics)
    category_weights = {
        "Apparel": 0.35,
        "Beauty": 0.25,
        "Home & Kitchen": 0.20,
        "Sports": 0.12,
        "Electronics": 0.08
    }
    prod_cat_weights = df_products["Category"].map(category_weights).values
    prod_probs = prod_cat_weights / prod_cat_weights.sum()

    sampled_prod_indices = np.random.choice(len(df_products), size=total_rows, p=prod_probs)
    sampled_product_ids = df_products["Product_ID"].iloc[sampled_prod_indices].values
    sampled_retail_prices = df_products["Retail_Price"].iloc[sampled_prod_indices].values
    sampled_unit_costs = df_products["Unit_Cost"].iloc[sampled_prod_indices].values

    # 4. Customer Selection: Pareto (80/20 rule) using Beta distribution
    customer_ids = df_customers["Customer_ID"].values
    # Generate customer ranks with high repeat purchase skew
    cust_skew = np.random.beta(a=0.5, b=2.5, size=total_rows)
    cust_indices = (cust_skew * (len(customer_ids) - 1)).astype(int)
    sampled_customer_ids = customer_ids[cust_indices]

    # 5. Quantities: Skewed towards 1, 2, 3 (Gamma/Poisson-like)
    quantities = np.random.choice([1, 2, 3, 4, 5, 8, 10], size=total_rows, p=[0.55, 0.25, 0.10, 0.05, 0.03, 0.01, 0.01])

    # 6. Discount Percentages: Realistic discount distribution (0%, 5%, 10%, 15%, 20%, 30%)
    discounts = np.random.choice([0.00, 0.05, 0.10, 0.15, 0.20, 0.30], size=total_rows, p=[0.45, 0.20, 0.18, 0.10, 0.05, 0.02])

    # 7. Shipping Cost: Base shipping based on quantity + tier
    shipping_base = np.where(quantities <= 2, 4.99, np.where(quantities <= 5, 8.99, 14.99))
    # Occasional free shipping for high spend
    free_shipping_mask = np.random.rand(total_rows) < 0.25
    shipping_costs = np.where(free_shipping_mask, 0.00, shipping_base)

    # 8. Order ID generation (allow multiple items per order by sharing order IDs across ~1.4 items per order)
    # Total unique orders ~350,000
    num_unique_orders = int(total_rows * 0.72)
    order_id_int = np.random.randint(1000000, 1000000 + num_unique_orders, size=total_rows)
    order_ids = [f"ORD-{x}" for x in order_id_int]

    # Calculate financial line items
    extended_price = np.round(sampled_retail_prices * quantities, 2)
    discount_amount = np.round(extended_price * discounts, 2)
    net_revenue = np.round(extended_price - discount_amount, 2)
    total_cost = np.round(sampled_unit_costs * quantities, 2)
    gross_profit = np.round(net_revenue - total_cost, 2)

    fact_df = pd.DataFrame({
        "Transaction_ID": [f"TXN-{i+1:08d}" for i in range(total_rows)],
        "Order_ID": order_ids,
        "Order_Date": sampled_dates,
        "Date_Key": sampled_date_keys,
        "Store_ID": sampled_store_ids,
        "Product_ID": sampled_product_ids,
        "Customer_ID": sampled_customer_ids,
        "Quantity": quantities,
        "Unit_Price": sampled_retail_prices,
        "Unit_Cost": sampled_unit_costs,
        "Discount_Pct": discounts,
        "Discount_Amount": discount_amount,
        "Net_Revenue": net_revenue,
        "Total_Cost": total_cost,
        "Gross_Profit": gross_profit,
        "Shipping_Cost": shipping_costs
    })

    return fact_df


# ==============================================================================
# MAIN EXECUTION ROUTINE
# ==============================================================================
def main():
    print("=" * 80)
    print("STARTING SYNTHETIC DATASET GENERATION")
    print(f"Target Destination: {OUTPUT_DIR}")
    print("=" * 80)
    start_time = time.time()

    # Step 1: Generate Dimension Tables
    df_stores = generate_dim_stores()
    df_products = generate_dim_products()
    df_customers = generate_dim_customers()
    df_calendar = generate_dim_calendar()

    # Step 2: Generate Fact Transactions (500,000 rows)
    df_transactions = generate_fact_transactions(
        df_stores=df_stores,
        df_products=df_products,
        df_customers=df_customers,
        df_calendar=df_calendar,
        total_rows=500000
    )

    # Step 3: Export CSVs
    print("\nWriting CSV files to disk...")
    df_stores.to_csv(os.path.join(OUTPUT_DIR, "Dim_Stores.csv"), index=False)
    print(f" -> Saved Dim_Stores.csv ({len(df_stores):,} rows)")

    df_products.to_csv(os.path.join(OUTPUT_DIR, "Dim_Products.csv"), index=False)
    print(f" -> Saved Dim_Products.csv ({len(df_products):,} rows)")

    df_customers.to_csv(os.path.join(OUTPUT_DIR, "Dim_Customers.csv"), index=False)
    print(f" -> Saved Dim_Customers.csv ({len(df_customers):,} rows)")

    df_calendar.to_csv(os.path.join(OUTPUT_DIR, "Dim_Calendar.csv"), index=False)
    print(f" -> Saved Dim_Calendar.csv ({len(df_calendar):,} rows)")

    df_transactions.to_csv(os.path.join(OUTPUT_DIR, "Fact_Transactions.csv"), index=False)
    print(f" -> Saved Fact_Transactions.csv ({len(df_transactions):,} rows)")

    elapsed = time.time() - start_time
    print("=" * 80)
    print(f"DATASET GENERATION COMPLETE in {elapsed:.2f} seconds!")
    print(f"All files successfully created in: {OUTPUT_DIR}")
    print("=" * 80)


if __name__ == "__main__":
    main()

