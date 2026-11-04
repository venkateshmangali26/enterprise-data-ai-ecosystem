"""
================================================================================
SYNTHETIC INDIAN RETAIL E-COMMERCE DATASET GENERATOR (STAR SCHEMA)
================================================================================
Target: 500,000 transaction rows across a clean Star Schema adapted for India.
Tables Generated:
  1. Dim_Stores (38 stores across North, South, West, East, Central Indian Metros)
  2. Dim_Products (250 products across 5 Indian retail categories in INR ₹)
  3. Dim_Customers (10,000 customers across Indian states, segments, and PIN codes)
  4. Dim_Calendar (Date dimension spanning FY 2023-24 to FY 2025-26 with Indian festive surges)
  5. Fact_Transactions (500,000 sales transactions with Diwali & Festive Season spikes)
"""

import os
import time
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

SEED = 42
np.random.seed(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ==============================================================================
# 1. DIM_STORES GENERATION (38 Indian Stores across 5 Regions)
# ==============================================================================
def generate_dim_stores() -> pd.DataFrame:
    print("[1/5] Generating Dim_Stores (38 Indian retail hubs)...")

    store_locations = [
        # North Region
        ("New Delhi", "DL", "North", "Flagship", 45000, "Connaught Place"),
        ("Gurgaon", "HR", "North", "Flagship", 38000, "CyberHub"),
        ("Noida", "UP", "North", "Mall", 32000, "Mall of India"),
        ("Chandigarh", "CH", "North", "Standard", 22000, "Sector 17 High Street"),
        ("Jaipur", "RJ", "North", "Standard", 20000, "MI Road"),
        ("Lucknow", "UP", "North", "Mall", 24000, "Hazratganj Phoenix Mall"),
        ("Ludhiana", "PB", "North", "Outlet", 18000, "Ferozepur Road"),
        ("Dehradun", "UK", "North", "Express", 8500, "Rajpur Road"),

        # South Region
        ("Bengaluru", "KA", "South", "Flagship", 52000, "Indiranagar 100ft Rd"),
        ("Bengaluru", "KA", "South", "Mall", 35000, "Whitefield Phoenix Mall"),
        ("Bengaluru", "KA", "South", "Standard", 24000, "Koramangala 80ft Rd"),
        ("Hyderabad", "TS", "South", "Flagship", 48000, "Jubilee Hills Road 36"),
        ("Hyderabad", "TS", "South", "Standard", 26000, "Hitec City Inorbit"),
        ("Chennai", "TN", "South", "Mall", 36000, "Express Avenue Royapettah"),
        ("Chennai", "TN", "South", "Standard", 22000, "T. Nagar Usman Road"),
        ("Kochi", "KL", "South", "Mall", 32000, "Lulu International Mall"),
        ("Coimbatore", "TN", "South", "Standard", 19000, "Brookefields Mall"),
        ("Visakhapatnam", "AP", "South", "Express", 9500, "VIP Road Siripuram"),

        # West Region
        ("Mumbai", "MH", "West", "Flagship", 50000, "Bandra Linking Road"),
        ("Mumbai", "MH", "West", "Mall", 42000, "Lower Parel Phoenix Palladium"),
        ("Mumbai", "MH", "West", "Outlet", 28000, "Thane Viviana Mall"),
        ("Pune", "MH", "West", "Mall", 36000, "Viman Nagar Phoenix Marketcity"),
        ("Pune", "MH", "West", "Standard", 23000, "FC Road High Street"),
        ("Ahmedabad", "GJ", "West", "Mall", 34000, "Vastrapur Ahmedabad One"),
        ("Ahmedabad", "GJ", "West", "Standard", 21000, "CG Road"),
        ("Surat", "GJ", "West", "Mall", 27000, "VR Mall Dumas Road"),
        ("Vadodara", "GJ", "West", "Standard", 19500, "Alkapuri"),
        ("Goa", "GA", "West", "Express", 11000, "Panjim MG Road"),

        # East Region
        ("Kolkata", "WB", "East", "Flagship", 42000, "South City Mall"),
        ("Kolkata", "WB", "East", "Standard", 25000, "Park Street Heritage"),
        ("Bhubaneswar", "OD", "East", "Mall", 22000, "Esplanade One Rasulgarh"),
        ("Patna", "BR", "East", "Mall", 20000, "City Centre Mall Frazer Rd"),
        ("Guwahati", "AS", "East", "Standard", 18000, "GS Road Christian Basti"),
        ("Ranchi", "JH", "East", "Mall", 16500, "Nucleus Mall Circular Rd"),

        # Central Region
        ("Indore", "MP", "Central", "Mall", 26000, "Treasure Island MG Road"),
        ("Bhopal", "MP", "Central", "Mall", 23000, "DB City Mall Arera Hills"),
        ("Nagpur", "MH", "Central", "Standard", 21000, "Empress City Mall"),
        ("Raipur", "CG", "Central", "Outlet", 19000, "Magneto The Mall"),
    ]

    stores_data = []
    base_opening_date = datetime(2015, 1, 1)

    for idx, (city, state, region, store_type, sqft, landmark) in enumerate(store_locations, start=1):
        store_id = f"STR-{idx:03d}"
        store_name = f"{city} {landmark} ({store_type})"
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

    return pd.DataFrame(stores_data)


# ==============================================================================
# 2. DIM_PRODUCTS GENERATION (250 Indian SKUs in INR ₹)
# ==============================================================================
def generate_dim_products() -> pd.DataFrame:
    print("[2/5] Generating Dim_Products (250 Indian products in INR ₹)...")

    category_config = {
        "Ethnic & Modern Apparel": {
            "subcategories": ["Kurtas & Sherwanis", "Sarees & Lehengas", "Formal & Chinos", "Footwear & Mojaris", "Athleisure"],
            "count": 60,
            "cost_range": (450.0, 5200.0),
            "margin_range": (0.45, 0.68),
            "prefixes": ["Banarasi", "Kanjeevaram", "FabHeritage", "RoyalSilk", "VedicWeave", "MetroStyle", "KhadiPure"]
        },
        "Electronics & Gadgets": {
            "subcategories": ["5G Smartphones", "TWS Earbuds & Audio", "Laptops & Tablets", "Smart Fitness Bands", "Smart Home Tech"],
            "count": 55,
            "cost_range": (1800.0, 68000.0),
            "margin_range": (0.18, 0.32),
            "prefixes": ["BharatPro", "SonicPulse", "VoltMax", "Optima", "QuantumX", "AeroSound", "NexGen"]
        },
        "Home & Kitchen": {
            "subcategories": ["Tri-Ply Cookware", "Mixer Grinders & Inductions", "Pooja Brassware", "Pure Cotton Bedsheets", "Copper & Tableware"],
            "count": 50,
            "cost_range": (650.0, 8500.0),
            "margin_range": (0.38, 0.58),
            "prefixes": ["SwachhHome", "ShreeCraft", "BrassHeritage", "IndusCook", "PureComfort", "VedicCopper"]
        },
        "Personal Care & Ayurveda": {
            "subcategories": ["Kumkumadi & Serums", "Bhringraj Hair Care", "Sandalwood & Attars", "Herbal Wellness", "Bath & Body"],
            "count": 45,
            "cost_range": (220.0, 2800.0),
            "margin_range": (0.55, 0.80),
            "prefixes": ["AyurPure", "ForestEssence", "KamaGlow", "VedaNaturals", "RasaOrganics", "DivyaHerbs"]
        },
        "Sports & Fitness": {
            "subcategories": ["Cricket Bats & Gear", "Badminton & Racquets", "Yoga Mats & Props", "Whey Protein & Nutrition", "Home Gym Gear"],
            "count": 40,
            "cost_range": (450.0, 9500.0),
            "margin_range": (0.35, 0.55),
            "prefixes": ["KashmirWillow", "ApexSport", "YogiBalance", "ProStamina", "GripMaster", "FitVeda"]
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
            prod_name = f"{prefix} {subcat.replace('s', '')} Edition {i+1}"

            cost = round(np.random.uniform(cfg["cost_range"][0], cfg["cost_range"][1]))
            margin = np.random.uniform(cfg["margin_range"][0], cfg["margin_range"][1])
            retail_price = round(cost / (1.0 - margin))

            products_data.append({
                "Product_ID": prod_id,
                "Product_Name": prod_name,
                "Category": category,
                "Sub_Category": subcat,
                "Unit_Cost": cost,
                "Retail_Price": retail_price
            })
            prod_counter += 1

    return pd.DataFrame(products_data)


# ==============================================================================
# 3. DIM_CUSTOMERS GENERATION (10,000 Indian Customers)
# ==============================================================================
def generate_dim_customers() -> pd.DataFrame:
    print("[3/5] Generating Dim_Customers (10,000 Indian customers)...")
    num_customers = 10000

    first_names = [
        "Aarav", "Rohan", "Priya", "Ananya", "Rajesh", "Suresh", "Deepa", "Vikram", "Neha", "Venkatesh",
        "Lakshmi", "Karthik", "Sneha", "Aditya", "Pooja", "Amit", "Meera", "Arjun", "Rahul", "Sunita",
        "Divya", "Manoj", "Swati", "Rakesh", "Tanvi", "Harish", "Anjali", "Gaurav", "Kavita", "Nikhil",
        "Manish", "Bhavna", "Kunal", "Pallavi", "Vivek", "Shreya", "Ashok", "Preeti", "Sanjay", "Ritu"
    ]
    last_names = [
        "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Rao", "Chatterjee", "Singh",
        "Joshi", "Deshmukh", "Kulkarni", "Mukherjee", "Agarwal", "Mehta", "Nambiar", "Pillai", "Bhat", "Choudhury",
        "Banerjee", "Menon", "Saxena", "Chauhan", "Mishra", "Trivedi", "Shetty", "Gowda", "Yadav", "Pandey"
    ]

    states = [
        "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu", "Delhi NCR", "Gujarat",
        "Uttar Pradesh", "West Bengal", "Rajasthan", "Kerala", "Madhya Pradesh", "Punjab", "Andhra Pradesh"
    ]
    state_weights = [
        0.16, 0.14, 0.12, 0.10, 0.12, 0.08,
        0.06, 0.05, 0.04, 0.04, 0.03, 0.03, 0.03
    ]

    segments = ["Retail Consumer", "Corporate & Enterprise", "SME & Kirana"]
    segment_weights = [0.68, 0.20, 0.12]

    chosen_first = np.random.choice(first_names, size=num_customers)
    chosen_last = np.random.choice(last_names, size=num_customers)
    chosen_states = np.random.choice(states, size=num_customers, p=state_weights)
    chosen_segments = np.random.choice(segments, size=num_customers, p=segment_weights)

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
        domain = "gmail.com" if chosen_segments[idx] == "Retail Consumer" else "corp-retail.in"
        email = f"{fn.lower()}.{ln.lower()}{idx+1}@{domain}"
        zip_code = f"{np.random.randint(110001, 800001)}"

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

    return pd.DataFrame(customers_data)


# ==============================================================================
# 4. DIM_CALENDAR GENERATION (3 Years with Indian Fiscal Quarters)
# ==============================================================================
def generate_dim_calendar() -> pd.DataFrame:
    print("[4/5] Generating Dim_Calendar (Indian Financial Years 2023 - 2025)...")
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
    calendar_df["Day_Of_Week"] = dates.dayofweek + 1
    calendar_df["Day_Name"] = dates.strftime("%A")
    calendar_df["Is_Weekend"] = dates.dayofweek.isin([5, 6])

    # Indian Fiscal Quarter (Apr-Jun: Q1, Jul-Sep: Q2, Oct-Dec: Q3, Jan-Mar: Q4)
    calendar_df["Fiscal_Quarter"] = np.where(
        dates.month.isin([4, 5, 6]), "FY-Q1",
        np.where(dates.month.isin([7, 8, 9]), "FY-Q2",
        np.where(dates.month.isin([10, 11, 12]), "FY-Q3", "FY-Q4"))
    )
    calendar_df["Fiscal_Year"] = np.where(dates.month >= 4, dates.year, dates.year - 1)

    return calendar_df


# ==============================================================================
# 5. FACT_TRANSACTIONS GENERATION (500,000 Rows with Diwali Surges)
# ==============================================================================
def generate_fact_transactions(
    df_stores: pd.DataFrame,
    df_products: pd.DataFrame,
    df_customers: pd.DataFrame,
    df_calendar: pd.DataFrame,
    total_rows: int = 500000
) -> pd.DataFrame:
    print(f"[5/5] Generating Fact_Transactions ({total_rows:,} rows with Indian Festive Spikes)...")

    calendar_dates = pd.to_datetime(df_calendar["Date"])
    base_weights = np.ones(len(df_calendar))

    # Indian seasonal multipliers
    month_multipliers = {
        1: 0.90, 2: 0.95, 3: 0.85, 4: 1.15, 5: 1.25, 6: 0.90,
        7: 0.80, 8: 1.30, 9: 1.55, 10: 2.75, 11: 2.85, 12: 1.70
    }

    for idx, dt in enumerate(calendar_dates):
        w = month_multipliers[dt.month]
        if dt.dayofweek in [5, 6]:
            w *= 1.45
        # High festive window (Dhanteras / Diwali)
        if (dt.month == 10 or dt.month == 11) and 12 <= dt.day <= 25:
            w *= 1.65
        base_weights[idx] = w

    date_probs = base_weights / base_weights.sum()
    sampled_date_indices = np.random.choice(len(df_calendar), size=total_rows, p=date_probs)
    sampled_dates = df_calendar["Date"].iloc[sampled_date_indices].values
    sampled_date_keys = df_calendar["Date_Key"].iloc[sampled_date_indices].values

    # Store sampling
    store_ids = df_stores["Store_ID"].values
    store_sqft = df_stores["Square_Footage"].values
    store_probs = store_sqft / store_sqft.sum()
    sampled_store_ids = np.random.choice(store_ids, size=total_rows, p=store_probs)

    # Product sampling
    category_weights = {
        "Ethnic & Modern Apparel": 0.36,
        "Electronics & Gadgets": 0.24,
        "Personal Care & Ayurveda": 0.18,
        "Home & Kitchen": 0.14,
        "Sports & Fitness": 0.08,
    }
    prod_cat_weights = df_products["Category"].map(category_weights).values
    prod_probs = prod_cat_weights / prod_cat_weights.sum()

    sampled_prod_indices = np.random.choice(len(df_products), size=total_rows, p=prod_probs)
    sampled_product_ids = df_products["Product_ID"].iloc[sampled_prod_indices].values
    sampled_retail_prices = df_products["Retail_Price"].iloc[sampled_prod_indices].values
    sampled_unit_costs = df_products["Unit_Cost"].iloc[sampled_prod_indices].values

    # Customer sampling: Beta distribution
    customer_ids = df_customers["Customer_ID"].values
    cust_skew = np.random.beta(a=0.5, b=2.2, size=total_rows)
    cust_indices = (cust_skew * (len(customer_ids) - 1)).astype(int)
    sampled_customer_ids = customer_ids[cust_indices]

    quantities = np.random.choice([1, 2, 3, 4, 5], size=total_rows, p=[0.60, 0.24, 0.10, 0.04, 0.02])
    discounts = np.random.choice([0.00, 0.05, 0.10, 0.15, 0.20, 0.25], size=total_rows, p=[0.40, 0.22, 0.18, 0.12, 0.06, 0.02])

    num_unique_orders = int(total_rows * 0.72)
    order_id_int = np.random.randint(1000000, 1000000 + num_unique_orders, size=total_rows)
    order_ids = [f"ORD-{x}" for x in order_id_int]

    extended_price = np.round(sampled_retail_prices * quantities)
    discount_amount = np.round(extended_price * discounts)
    net_revenue = extended_price - discount_amount
    total_cost = np.round(sampled_unit_costs * quantities)
    gross_profit = net_revenue - total_cost

    # Shipping in INR
    shipping_base = np.where(quantities <= 2, 49.0, 99.0)
    free_shipping = net_revenue >= 999.0
    shipping_costs = np.where(free_shipping, 0.0, shipping_base)

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
# MAIN ROUTINE
# ==============================================================================
def main():
    print("=" * 80)
    print("STARTING INDIAN SYNTHETIC DATASET GENERATION")
    print(f"Target Destination: {OUTPUT_DIR}")
    print("=" * 80)
    start_time = time.time()

    df_stores = generate_dim_stores()
    df_products = generate_dim_products()
    df_customers = generate_dim_customers()
    df_calendar = generate_dim_calendar()

    df_transactions = generate_fact_transactions(
        df_stores=df_stores,
        df_products=df_products,
        df_customers=df_customers,
        df_calendar=df_calendar,
        total_rows=500000
    )

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
