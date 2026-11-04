import { db, initDatabaseSchema } from "./db";

console.log("⚡ Initializing Star Schema Database tables...");
initDatabaseSchema();

// Check if data already exists
const countResult = db.query("SELECT COUNT(*) as count FROM fact_transactions").get() as { count: number };
if (countResult && countResult.count > 0) {
  console.log(`Database already seeded with ${countResult.count.toLocaleString()} transactions. Skipping seed.`);
  process.exit(0);
}

console.log("🌱 Starting Star Schema Data Generation & Database Seeding...");
const startTime = performance.now();

// -----------------------------------------------------------------------------
// 1. SEED DIM_STORES (38 Stores)
// -----------------------------------------------------------------------------
console.log("[1/5] Seeding Dim_Stores (38 stores)...");
const storeLocations = [
  // East Region
  { city: "New York", state: "NY", region: "East", type: "Flagship", sqft: 45000 },
  { city: "Boston", state: "MA", region: "East", type: "Standard", sqft: 22000 },
  { city: "Philadelphia", state: "PA", region: "East", type: "Standard", sqft: 25000 },
  { city: "Pittsburgh", state: "PA", region: "East", type: "Mall", sqft: 18000 },
  { city: "Baltimore", state: "MD", region: "East", type: "Express", sqft: 9500 },
  { city: "Newark", state: "NJ", region: "East", type: "Outlet", sqft: 32000 },
  { city: "Hartford", state: "CT", region: "East", type: "Express", sqft: 8500 },
  { city: "Providence", state: "RI", region: "East", type: "Mall", sqft: 16000 },
  { city: "Buffalo", state: "NY", region: "East", type: "Outlet", sqft: 28000 },
  // West Region
  { city: "Los Angeles", state: "CA", region: "West", type: "Flagship", sqft: 52000 },
  { city: "San Francisco", state: "CA", region: "West", type: "Flagship", sqft: 38000 },
  { city: "Seattle", state: "WA", region: "West", type: "Standard", sqft: 26000 },
  { city: "Portland", state: "OR", region: "West", type: "Standard", sqft: 21000 },
  { city: "San Diego", state: "CA", region: "West", type: "Standard", sqft: 24000 },
  { city: "San Jose", state: "CA", region: "West", type: "Mall", sqft: 19500 },
  { city: "Phoenix", state: "AZ", region: "West", type: "Outlet", sqft: 34000 },
  { city: "Denver", state: "CO", region: "West", type: "Standard", sqft: 25000 },
  { city: "Las Vegas", state: "NV", region: "West", type: "Outlet", sqft: 36000 },
  { city: "Salt Lake City", state: "UT", region: "West", type: "Express", sqft: 9000 },
  // Midwest Region
  { city: "Chicago", state: "IL", region: "Midwest", type: "Flagship", sqft: 48000 },
  { city: "Detroit", state: "MI", region: "Midwest", type: "Standard", sqft: 23000 },
  { city: "Minneapolis", state: "MN", region: "Midwest", type: "Standard", sqft: 22500 },
  { city: "Cleveland", state: "OH", region: "Midwest", type: "Mall", sqft: 17500 },
  { city: "Columbus", state: "OH", region: "Midwest", type: "Standard", sqft: 20000 },
  { city: "Indianapolis", state: "IN", region: "Midwest", type: "Standard", sqft: 19000 },
  { city: "Milwaukee", state: "WI", region: "Midwest", type: "Outlet", sqft: 29000 },
  { city: "Kansas City", state: "MO", region: "Midwest", type: "Mall", sqft: 18500 },
  { city: "St. Louis", state: "MO", region: "Midwest", type: "Outlet", sqft: 31000 },
  // South Region
  { city: "Dallas", state: "TX", region: "South", type: "Flagship", sqft: 50000 },
  { city: "Houston", state: "TX", region: "South", type: "Flagship", sqft: 46000 },
  { city: "Austin", state: "TX", region: "South", type: "Standard", sqft: 24000 },
  { city: "Atlanta", state: "GA", region: "South", type: "Flagship", sqft: 42000 },
  { city: "Miami", state: "FL", region: "South", type: "Standard", sqft: 28000 },
  { city: "Orlando", state: "FL", region: "South", type: "Outlet", sqft: 35000 },
  { city: "Charlotte", state: "NC", region: "South", type: "Standard", sqft: 22000 },
  { city: "Nashville", state: "TN", region: "South", type: "Mall", sqft: 19000 },
  { city: "New Orleans", state: "LA", region: "South", type: "Express", sqft: 8800 },
  { city: "Tampa", state: "FL", region: "South", type: "Mall", sqft: 20500 },
];

const insertStore = db.prepare(`
  INSERT INTO dim_stores (store_id, store_name, city, state, region, store_type, square_footage, opening_date, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`);

const storeIds: string[] = [];
const storeSqfts: number[] = [];

db.transaction(() => {
  storeLocations.forEach((s, idx) => {
    const storeId = `STR-${String(idx + 1).padStart(3, "0")}`;
    const storeName = `${s.city} ${s.type} Store`;
    const openDate = `201${5 + (idx % 6)}-${String((idx % 12) + 1).padStart(2, "0")}-15`;
    insertStore.run(storeId, storeName, s.city, s.state, s.region, s.type, s.sqft, openDate);
    storeIds.push(storeId);
    storeSqfts.push(s.sqft);
  });
})();

// -----------------------------------------------------------------------------
// 2. SEED DIM_PRODUCTS (250 Products across 5 Categories)
// -----------------------------------------------------------------------------
console.log("[2/5] Seeding Dim_Products (250 products)...");
const categoriesConfig = [
  {
    name: "Electronics",
    subcategories: ["Smartphones", "Audio", "Laptops & Tablets", "Wearables", "Accessories"],
    count: 55,
    costRange: [35.0, 950.0],
    marginRange: [0.18, 0.35],
    prefixes: ["Pro", "Ultra", "Max", "Quantum", "Pulse", "Sonic", "Apex"],
  },
  {
    name: "Apparel",
    subcategories: ["Men's Wear", "Women's Wear", "Footwear", "Outerwear", "Athletic"],
    count: 60,
    costRange: [8.0, 85.0],
    marginRange: [0.45, 0.68],
    prefixes: ["Classic", "Comfort", "Heritage", "Modern", "Essential", "Breeze"],
  },
  {
    name: "Home & Kitchen",
    subcategories: ["Cookware", "Small Appliances", "Bedding", "Decor", "Storage"],
    count: 50,
    costRange: [12.0, 180.0],
    marginRange: [0.40, 0.60],
    prefixes: ["Artisan", "Culinary", "EcoHome", "Pure", "Haven", "Gourmet"],
  },
  {
    name: "Sports",
    subcategories: ["Fitness Equipment", "Outdoor Gear", "Team Sports", "Cycling", "Yoga"],
    count: 45,
    costRange: [10.0, 240.0],
    marginRange: [0.35, 0.55],
    prefixes: ["Apex", "Velocity", "Summit", "Dynamic", "ProForm", "Endure"],
  },
  {
    name: "Beauty",
    subcategories: ["Skincare", "Haircare", "Fragrance", "Makeup", "Bath & Body"],
    count: 40,
    costRange: [5.0, 65.0],
    marginRange: [0.55, 0.80],
    prefixes: ["Radiance", "Luxe", "Botanical", "Glow", "Derma", "Silk"],
  },
];

const insertProduct = db.prepare(`
  INSERT INTO dim_products (product_id, product_name, category, sub_category, unit_cost, retail_price)
  VALUES (?, ?, ?, ?, ?, ?)
`);

interface ProductItem {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  unitCost: number;
  retailPrice: number;
}
const productsList: ProductItem[] = [];

db.transaction(() => {
  let prodCounter = 1;
  for (const cat of categoriesConfig) {
    for (let i = 0; i < cat.count; i++) {
      const prodId = `PRD-${String(prodCounter).padStart(4, "0")}`;
      const subCat = cat.subcategories[i % cat.subcategories.length];
      const prefix = cat.prefixes[i % cat.prefixes.length];
      const prodName = `${prefix} ${subCat.replace(/s$/, "")} ${i + 1}`;
      
      const cost = Math.round((cat.costRange[0] + Math.random() * (cat.costRange[1] - cat.costRange[0])) * 100) / 100;
      const margin = cat.marginRange[0] + Math.random() * (cat.marginRange[1] - cat.marginRange[0]);
      const retail = Math.round((cost / (1 - margin)) * 100) / 100;

      insertProduct.run(prodId, prodName, cat.name, subCat, cost, retail);
      productsList.push({ id: prodId, name: prodName, category: cat.name, subCategory: subCat, unitCost: cost, retailPrice: retail });
      prodCounter++;
    }
  }
})();

// -----------------------------------------------------------------------------
// 3. SEED DIM_CUSTOMERS (10,000 Customers)
// -----------------------------------------------------------------------------
console.log("[3/5] Seeding Dim_Customers (10,000 customers)...");
const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Sarah", "William", "Karen", "Thomas", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Sandra"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris"];
const custStates = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "WA", "CO", "NJ", "VA", "AZ"];
const segments = ["Consumer", "Corporate", "Home Office"];
const segmentWeights = [0.65, 0.25, 0.10];

const insertCustomer = db.prepare(`
  INSERT INTO dim_customers (customer_id, first_name, last_name, email, segment, state, postal_code, signup_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const customerIds: string[] = [];

db.transaction(() => {
  for (let i = 1; i <= 10000; i++) {
    const custId = `CUST-${String(i).padStart(6, "0")}`;
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randSeg = Math.random();
    const seg = randSeg < 0.65 ? segments[0] : randSeg < 0.90 ? segments[1] : segments[2];
    const st = custStates[Math.floor(Math.random() * custStates.length)];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${seg === "Consumer" ? "example.com" : "corp-retail.org"}`;
    const zip = String(10000 + Math.floor(Math.random() * 89999));
    const signupDaysAgo = Math.floor(Math.random() * 1500);
    const signupDate = new Date(Date.now() - signupDaysAgo * 86400000).toISOString().split("T")[0];

    insertCustomer.run(custId, fn, ln, email, seg, st, zip, signupDate);
    customerIds.push(custId);
  }
})();

// -----------------------------------------------------------------------------
// 4. SEED DIM_CALENDAR (3 Years: 2023-01-01 to 2025-12-31)
// -----------------------------------------------------------------------------
console.log("[4/5] Seeding Dim_Calendar (2023 - 2025)...");
const insertCalendar = db.prepare(`
  INSERT INTO dim_calendar (date_key, date, year, quarter, quarter_name, month, month_name, month_short, day, day_of_week, day_name, is_weekend, fiscal_quarter, fiscal_year)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const calendarDays: { dateKey: number; dateStr: string; month: number; isWeekend: boolean }[] = [];
const startDate = new Date(2023, 0, 1);
const endDate = new Date(2025, 11, 31);
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthShorts = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

db.transaction(() => {
  let curr = new Date(startDate);
  while (curr <= endDate) {
    const y = curr.getFullYear();
    const m = curr.getMonth() + 1; // 1-12
    const d = curr.getDate();
    const dow = curr.getDay(); // 0 = Sunday, 6 = Saturday
    const isWknd = dow === 0 || dow === 6 ? 1 : 0;
    const q = Math.ceil(m / 3);
    const dateKey = y * 10000 + m * 100 + d;
    const dateStr = curr.toISOString().split("T")[0];
    const qName = `Q${q} ${y}`;
    const fq = m in [2, 3, 4] ? "FQ1" : m in [5, 6, 7] ? "FQ2" : m in [8, 9, 10] ? "FQ3" : "FQ4";
    const fy = m >= 2 ? y : y - 1;

    insertCalendar.run(dateKey, dateStr, y, q, qName, m, monthNames[m - 1], monthShorts[m - 1], d, dow === 0 ? 7 : dow, dayNames[dow], isWknd, fq, fy);
    calendarDays.push({ dateKey, dateStr, month: m, isWeekend: isWknd === 1 });
    curr.setDate(curr.getDate() + 1);
  }
})();

// -----------------------------------------------------------------------------
// 5. SEED FACT_TRANSACTIONS (150,000 High-Throughput Rows with Seasonality)
// -----------------------------------------------------------------------------
const TOTAL_TXNS = 150000;
console.log(`[5/5] Seeding Fact_Transactions (${TOTAL_TXNS.toLocaleString()} rows with realistic seasonal spikes)...`);

const insertFact = db.prepare(`
  INSERT INTO fact_transactions (
    transaction_id, order_id, order_date, date_key, store_id, product_id, customer_id,
    quantity, unit_price, unit_cost, discount_pct, discount_amount, net_revenue,
    total_cost, gross_profit, shipping_cost
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Month multipliers
const monthWeights: Record<number, number> = {
  1: 0.75, 2: 0.8, 3: 0.95, 4: 0.9, 5: 1.0, 6: 1.05,
  7: 1.25, 8: 1.1, 9: 0.95, 10: 1.15, 11: 2.10, 12: 2.45,
};

// Compute cumulative calendar weights
const calWeights = calendarDays.map((c) => {
  let w = monthWeights[c.month];
  if (c.isWeekend) w *= 1.4;
  return w;
});
const totalCalWeight = calWeights.reduce((a, b) => a + b, 0);
const calCumProb = calWeights.reduce((acc: number[], curr, idx) => {
  const prev = idx === 0 ? 0 : acc[idx - 1];
  acc.push(prev + curr / totalCalWeight);
  return acc;
}, []);

function getRandomCalendarDay() {
  const r = Math.random();
  let low = 0, high = calCumProb.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (calCumProb[mid] < r) low = mid + 1;
    else high = mid;
  }
  return calendarDays[low];
}

// Category product distribution: Apparel (35%), Beauty (25%), Home (20%), Sports (12%), Electronics (8%)
const categoryWeights: Record<string, number> = {
  Apparel: 0.35,
  Beauty: 0.25,
  "Home & Kitchen": 0.20,
  Sports: 0.12,
  Electronics: 0.08,
};
const productWeights = productsList.map((p) => categoryWeights[p.category]);
const totalProdWeight = productWeights.reduce((a, b) => a + b, 0);
const prodCumProb = productWeights.reduce((acc: number[], curr, idx) => {
  const prev = idx === 0 ? 0 : acc[idx - 1];
  acc.push(prev + curr / totalProdWeight);
  return acc;
}, []);

function getRandomProduct() {
  const r = Math.random();
  let low = 0, high = prodCumProb.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (prodCumProb[mid] < r) low = mid + 1;
    else high = mid;
  }
  return productsList[low];
}

// Store square footage distribution
const totalSqft = storeSqfts.reduce((a, b) => a + b, 0);
const storeCumProb = storeSqfts.reduce((acc: number[], curr, idx) => {
  const prev = idx === 0 ? 0 : acc[idx - 1];
  acc.push(prev + curr / totalSqft);
  return acc;
}, []);

function getRandomStore() {
  const r = Math.random();
  let low = 0, high = storeCumProb.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (storeCumProb[mid] < r) low = mid + 1;
    else high = mid;
  }
  return storeIds[low];
}

// Customer Pareto distribution (Power law skew)
function getRandomCustomer() {
  // Power skew: r^2.2 concentrates transactions on top 20%
  const rank = Math.floor(Math.pow(Math.random(), 2.2) * customerIds.length);
  return customerIds[Math.min(rank, customerIds.length - 1)];
}

const quantities = [1, 1, 1, 2, 2, 3, 4, 5];
const discountRates = [0.0, 0.0, 0.05, 0.10, 0.15, 0.20];

// Insert in chunks of 5000 in transactions
const BATCH_SIZE = 5000;
let txCount = 0;

for (let batch = 0; batch < TOTAL_TXNS; batch += BATCH_SIZE) {
  db.transaction(() => {
    const limit = Math.min(batch + BATCH_SIZE, TOTAL_TXNS);
    for (let i = batch; i < limit; i++) {
      const txId = `TXN-${String(i + 1).padStart(8, "0")}`;
      const orderId = `ORD-${1000000 + Math.floor(i * 0.72)}`;
      const cal = getRandomCalendarDay();
      const storeId = getRandomStore();
      const prod = getRandomProduct();
      const custId = getRandomCustomer();
      
      const qty = quantities[Math.floor(Math.random() * quantities.length)];
      const discPct = discountRates[Math.floor(Math.random() * discountRates.length)];
      
      const extPrice = Math.round(prod.retailPrice * qty * 100) / 100;
      const discAmt = Math.round(extPrice * discPct * 100) / 100;
      const netRev = Math.round((extPrice - discAmt) * 100) / 100;
      const totCost = Math.round(prod.unitCost * qty * 100) / 100;
      const profit = Math.round((netRev - totCost) * 100) / 100;
      const shipping = qty <= 2 ? 4.99 : 9.99;
      const actualShipping = Math.random() < 0.25 ? 0.0 : shipping;

      insertFact.run(
        txId, orderId, cal.dateStr, cal.dateKey, storeId, prod.id, custId,
        qty, prod.retailPrice, prod.unitCost, discPct, discAmt, netRev,
        totCost, profit, actualShipping
      );
      txCount++;
    }
  })();
}

const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`✅ Seeding Complete! Loaded ${txCount.toLocaleString()} transactions across Star Schema in ${elapsed}s.`);

