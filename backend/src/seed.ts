import { db, initDatabaseSchema } from "./db";

console.log("⚡ Initializing Star Schema Database tables...");
initDatabaseSchema();

// Reset existing data to allow fresh Indian retail seeding
console.log("🧹 Clearing old tables for Indian retail ecosystem...");
db.run("DELETE FROM fact_transactions");
db.run("DELETE FROM dim_calendar");
db.run("DELETE FROM dim_customers");
db.run("DELETE FROM dim_products");
db.run("DELETE FROM dim_stores");

console.log("🌱 Starting Indian Retail Star Schema Data Generation & Seeding...");
const startTime = performance.now();

// -----------------------------------------------------------------------------
// 1. SEED DIM_STORES (38 Stores across Indian Metros & Growth Hubs)
// -----------------------------------------------------------------------------
console.log("[1/5] Seeding Dim_Stores (38 Indian stores across 5 regions)...");
const storeLocations = [
  // North Region
  { city: "New Delhi", state: "DL", region: "North", type: "Flagship", sqft: 45000, landmark: "Connaught Place" },
  { city: "Gurgaon", state: "HR", region: "North", type: "Flagship", sqft: 38000, landmark: "CyberHub" },
  { city: "Noida", state: "UP", region: "North", type: "Mall", sqft: 32000, landmark: "Mall of India" },
  { city: "Chandigarh", state: "CH", region: "North", type: "Standard", sqft: 22000, landmark: "Sector 17 High Street" },
  { city: "Jaipur", state: "RJ", region: "North", type: "Standard", sqft: 20000, landmark: "MI Road" },
  { city: "Lucknow", state: "UP", region: "North", type: "Mall", sqft: 24000, landmark: "Hazratganj Phoenix Mall" },
  { city: "Ludhiana", state: "PB", region: "North", type: "Outlet", sqft: 18000, landmark: "Ferozepur Road" },
  { city: "Dehradun", state: "UK", region: "North", type: "Express", sqft: 8500, landmark: "Rajpur Road" },

  // South Region
  { city: "Bengaluru", state: "KA", region: "South", type: "Flagship", sqft: 52000, landmark: "Indiranagar 100ft Rd" },
  { city: "Bengaluru", state: "KA", region: "South", type: "Mall", sqft: 35000, landmark: "Whitefield Phoenix Mall" },
  { city: "Bengaluru", state: "KA", region: "South", type: "Standard", sqft: 24000, landmark: "Koramangala 80ft Rd" },
  { city: "Hyderabad", state: "TS", region: "South", type: "Flagship", sqft: 48000, landmark: "Jubilee Hills Road 36" },
  { city: "Hyderabad", state: "TS", region: "South", type: "Standard", sqft: 26000, landmark: "Hitec City Inorbit" },
  { city: "Chennai", state: "TN", region: "South", type: "Mall", sqft: 36000, landmark: "Express Avenue Royapettah" },
  { city: "Chennai", state: "TN", region: "South", type: "Standard", sqft: 22000, landmark: "T. Nagar Usman Road" },
  { city: "Kochi", state: "KL", region: "South", type: "Mall", sqft: 32000, landmark: "Lulu International Mall" },
  { city: "Coimbatore", state: "TN", region: "South", type: "Standard", sqft: 19000, landmark: "Brookefields Mall" },
  { city: "Visakhapatnam", state: "AP", region: "South", type: "Express", sqft: 9500, landmark: "VIP Road Siripuram" },

  // West Region
  { city: "Mumbai", state: "MH", region: "West", type: "Flagship", sqft: 50000, landmark: "Bandra Linking Road" },
  { city: "Mumbai", state: "MH", region: "West", type: "Mall", sqft: 42000, landmark: "Lower Parel Phoenix Palladium" },
  { city: "Mumbai", state: "MH", region: "West", type: "Outlet", sqft: 28000, landmark: "Thane Viviana Mall" },
  { city: "Pune", state: "MH", region: "West", type: "Mall", sqft: 36000, landmark: "Viman Nagar Phoenix Marketcity" },
  { city: "Pune", state: "MH", region: "West", type: "Standard", sqft: 23000, landmark: "FC Road High Street" },
  { city: "Ahmedabad", state: "GJ", region: "West", type: "Mall", sqft: 34000, landmark: "Vastrapur Ahmedabad One" },
  { city: "Ahmedabad", state: "GJ", region: "West", type: "Standard", sqft: 21000, landmark: "CG Road" },
  { city: "Surat", state: "GJ", region: "West", type: "Mall", sqft: 27000, landmark: "VR Mall Dumas Road" },
  { city: "Vadodara", state: "GJ", region: "West", type: "Standard", sqft: 19500, landmark: "Alkapuri" },
  { city: "Goa", state: "GA", region: "West", type: "Express", sqft: 11000, landmark: "Panjim MG Road" },

  // East Region
  { city: "Kolkata", state: "WB", region: "East", type: "Flagship", sqft: 42000, landmark: "South City Mall" },
  { city: "Kolkata", state: "WB", region: "East", type: "Standard", sqft: 25000, landmark: "Park Street Heritage" },
  { city: "Bhubaneswar", state: "OD", region: "East", type: "Mall", sqft: 22000, landmark: "Esplanade One Rasulgarh" },
  { city: "Patna", state: "BR", region: "East", type: "Mall", sqft: 20000, landmark: "City Centre Mall Frazer Rd" },
  { city: "Guwahati", state: "AS", region: "East", type: "Standard", sqft: 18000, landmark: "GS Road Christian Basti" },
  { city: "Ranchi", state: "JH", region: "East", type: "Mall", sqft: 16500, landmark: "Nucleus Mall Circular Rd" },

  // Central Region
  { city: "Indore", state: "MP", region: "Central", type: "Mall", sqft: 26000, landmark: "Treasure Island MG Road" },
  { city: "Bhopal", state: "MP", region: "Central", type: "Mall", sqft: 23000, landmark: "DB City Mall Arera Hills" },
  { city: "Nagpur", state: "MH", region: "Central", type: "Standard", sqft: 21000, landmark: "Empress City Mall" },
  { city: "Raipur", state: "CG", region: "Central", type: "Outlet", sqft: 19000, landmark: "Magneto The Mall" },
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
    const storeName = `${s.city} ${s.landmark} (${s.type})`;
    const openDate = `201${5 + (idx % 6)}-${String((idx % 12) + 1).padStart(2, "0")}-15`;
    insertStore.run(storeId, storeName, s.city, s.state, s.region, s.type, s.sqft, openDate);
    storeIds.push(storeId);
    storeSqfts.push(s.sqft);
  });
})();

// -----------------------------------------------------------------------------
// 2. SEED DIM_PRODUCTS (250 Products across 5 Indian Retail Categories)
// -----------------------------------------------------------------------------
console.log("[2/5] Seeding Dim_Products (250 Indian products in INR ₹)...");
const categoriesConfig = [
  {
    name: "Ethnic & Modern Apparel",
    subcategories: ["Kurtas & Sherwanis", "Sarees & Lehengas", "Formal & Chinos", "Footwear & Mojaris", "Athleisure"],
    count: 60,
    costRange: [450.0, 5200.0], // in ₹
    marginRange: [0.45, 0.68],
    prefixes: ["Banarasi", "Kanjeevaram", "FabHeritage", "RoyalSilk", "VedicWeave", "MetroStyle", "KhadiPure"],
  },
  {
    name: "Electronics & Gadgets",
    subcategories: ["5G Smartphones", "TWS Earbuds & Audio", "Laptops & Tablets", "Smart Fitness Bands", "Smart Home Tech"],
    count: 55,
    costRange: [1800.0, 68000.0], // in ₹
    marginRange: [0.18, 0.32],
    prefixes: ["BharatPro", "SonicPulse", "VoltMax", "Optima", "QuantumX", "AeroSound", "NexGen"],
  },
  {
    name: "Home & Kitchen",
    subcategories: ["Tri-Ply Cookware", "Mixer Grinders & Inductions", "Pooja Brassware", "Pure Cotton Bedsheets", "Copper & Tableware"],
    count: 50,
    costRange: [650.0, 8500.0], // in ₹
    marginRange: [0.38, 0.58],
    prefixes: ["SwachhHome", "ShreeCraft", "BrassHeritage", "IndusCook", "PureComfort", "VedicCopper"],
  },
  {
    name: "Personal Care & Ayurveda",
    subcategories: ["Kumkumadi & Serums", "Bhringraj Hair Care", "Sandalwood & Attars", "Herbal Wellness", "Bath & Body"],
    count: 45,
    costRange: [220.0, 2800.0], // in ₹
    marginRange: [0.55, 0.80],
    prefixes: ["AyurPure", "ForestEssence", "KamaGlow", "VedaNaturals", "RasaOrganics", "DivyaHerbs"],
  },
  {
    name: "Sports & Fitness",
    subcategories: ["Cricket Bats & Gear", "Badminton & Racquets", "Yoga Mats & Props", "Whey Protein & Nutrition", "Home Gym Gear"],
    count: 40,
    costRange: [450.0, 9500.0], // in ₹
    marginRange: [0.35, 0.55],
    prefixes: ["KashmirWillow", "ApexSport", "YogiBalance", "ProStamina", "GripMaster", "FitVeda"],
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
      const prodName = `${prefix} ${subCat.replace(/s$/, "")} Edition ${i + 1}`;
      
      const cost = Math.round(cat.costRange[0] + Math.random() * (cat.costRange[1] - cat.costRange[0]));
      const margin = cat.marginRange[0] + Math.random() * (cat.marginRange[1] - cat.marginRange[0]);
      const retail = Math.round(cost / (1 - margin));

      insertProduct.run(prodId, prodName, cat.name, subCat, cost, retail);
      productsList.push({ id: prodId, name: prodName, category: cat.name, subCategory: subCat, unitCost: cost, retailPrice: retail });
      prodCounter++;
    }
  }
})();

// -----------------------------------------------------------------------------
// 3. SEED DIM_CUSTOMERS (10,000 Indian Customers)
// -----------------------------------------------------------------------------
console.log("[3/5] Seeding Dim_Customers (10,000 Indian customers)...");
const firstNames = [
  "Aarav", "Rohan", "Priya", "Ananya", "Rajesh", "Suresh", "Deepa", "Vikram", "Neha", "Venkatesh",
  "Lakshmi", "Karthik", "Sneha", "Aditya", "Pooja", "Amit", "Meera", "Arjun", "Rahul", "Sunita",
  "Divya", "Manoj", "Swati", "Rakesh", "Tanvi", "Harish", "Anjali", "Gaurav", "Kavita", "Nikhil",
  "Manish", "Bhavna", "Kunal", "Pallavi", "Vivek", "Shreya", "Ashok", "Preeti", "Sanjay", "Ritu"
];
const lastNames = [
  "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Gupta", "Rao", "Chatterjee", "Singh",
  "Joshi", "Deshmukh", "Kulkarni", "Mukherjee", "Agarwal", "Mehta", "Nambiar", "Pillai", "Bhat", "Choudhury",
  "Banerjee", "Menon", "Saxena", "Chauhan", "Mishra", "Trivedi", "Shetty", "Gowda", "Yadav", "Pandey"
];
const custStates = [
  "Maharashtra", "Karnataka", "Telangana", "Tamil Nadu", "Delhi NCR", "Gujarat",
  "Uttar Pradesh", "West Bengal", "Rajasthan", "Kerala", "Madhya Pradesh", "Punjab", "Andhra Pradesh"
];
const statePincodes: Record<string, number> = {
  Maharashtra: 400001,
  Karnataka: 560001,
  Telangana: 500001,
  "Tamil Nadu": 600001,
  "Delhi NCR": 110001,
  Gujarat: 380001,
  "Uttar Pradesh": 226001,
  "West Bengal": 700001,
  Rajasthan: 302001,
  Kerala: 682001,
  "Madhya Pradesh": 452001,
  Punjab: 141001,
  "Andhra Pradesh": 530001,
};

const segments = ["Retail Consumer", "Corporate & Enterprise", "SME & Kirana"];

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
    const seg = randSeg < 0.68 ? segments[0] : randSeg < 0.88 ? segments[1] : segments[2];
    const st = custStates[Math.floor(Math.random() * custStates.length)];
    const basePin = statePincodes[st] || 560001;
    const pin = String(basePin + Math.floor(Math.random() * 50));
    const domain = seg === "Retail Consumer" ? "gmail.com" : seg === "Corporate & Enterprise" ? "tcs-enterprise.in" : "kirana-network.in";
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${domain}`;
    const signupDaysAgo = Math.floor(Math.random() * 1500);
    const signupDate = new Date(Date.now() - signupDaysAgo * 86400000).toISOString().split("T")[0];

    insertCustomer.run(custId, fn, ln, email, seg, st, pin, signupDate);
    customerIds.push(custId);
  }
})();

// -----------------------------------------------------------------------------
// 4. SEED DIM_CALENDAR (3 Years: 2023-01-01 to 2025-12-31 with Indian Fiscal Year)
// -----------------------------------------------------------------------------
console.log("[4/5] Seeding Dim_Calendar (2023 - 2025 Indian Financial Years)...");
const insertCalendar = db.prepare(`
  INSERT INTO dim_calendar (date_key, date, year, quarter, quarter_name, month, month_name, month_short, day, day_of_week, day_name, is_weekend, fiscal_quarter, fiscal_year)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const calendarDays: { dateKey: number; dateStr: string; month: number; day: number; isWeekend: boolean }[] = [];
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
    const dow = curr.getDay();
    const isWknd = dow === 0 || dow === 6 ? 1 : 0;
    const q = Math.ceil(m / 3);
    const dateKey = y * 10000 + m * 100 + d;
    const dateStr = curr.toISOString().split("T")[0];
    const qName = `Q${q} ${y}`;
    
    // Indian Fiscal Year: April 1 to March 31
    // Q1: Apr-Jun | Q2: Jul-Sep | Q3: Oct-Dec | Q4: Jan-Mar
    const fq = m in [4, 5, 6] ? "FY-Q1" : m in [7, 8, 9] ? "FY-Q2" : m in [10, 11, 12] ? "FY-Q3" : "FY-Q4";
    const fy = m >= 4 ? y : y - 1;

    insertCalendar.run(dateKey, dateStr, y, q, qName, m, monthNames[m - 1], monthShorts[m - 1], d, dow === 0 ? 7 : dow, dayNames[dow], isWknd, fq, fy);
    calendarDays.push({ dateKey, dateStr, month: m, day: d, isWeekend: isWknd === 1 });
    curr.setDate(curr.getDate() + 1);
  }
})();

// -----------------------------------------------------------------------------
// 5. SEED FACT_TRANSACTIONS (150,000 Rows with Indian Festive Surges)
// -----------------------------------------------------------------------------
const TOTAL_TXNS = 150000;
console.log(`[5/5] Seeding Fact_Transactions (${TOTAL_TXNS.toLocaleString()} rows with Diwali & Festive Season surges)...`);

const insertFact = db.prepare(`
  INSERT INTO fact_transactions (
    transaction_id, order_id, order_date, date_key, store_id, product_id, customer_id,
    quantity, unit_price, unit_cost, discount_pct, discount_amount, net_revenue,
    total_cost, gross_profit, shipping_cost
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Indian festive month multipliers:
// October / November: Diwali, Dhanteras, Navratri, Durga Puja, Bhai Dooj & Big Festive Sales (2.7x - 2.9x)
// December / January: Wedding Season, Makar Sankranti & Winter Sales (1.5x - 1.8x)
// August: Independence Day Mega Sale & Raksha Bandhan (1.3x)
// April / May: Akshaya Tritiya, Ugadi & Summer Sales (1.2x)
const monthWeights: Record<number, number> = {
  1: 0.90,  // Sankranti / Pongal sales
  2: 0.95,  // Wedding season phase 1
  3: 0.85,  // Fiscal year close
  4: 1.15,  // Akshaya Tritiya & Ugadi
  5: 1.25,  // Summer holiday rush
  6: 0.90,  // Monsoon start
  7: 0.80,  // Monsoon slump
  8: 1.30,  // Independence Day & Raksha Bandhan
  9: 1.55,  // Ganesh Chaturthi & Navratri start
  10: 2.75, // Diwali, Dussehra, Dhanteras, Durga Puja!
  11: 2.85, // Diwali week, Wedding season & Black Friday Indian edition
  12: 1.70, // Christmas, New Year & Winter Wedding peak
};

// Compute cumulative calendar weights with Dhanteras & Diwali boosts
const calWeights = calendarDays.map((c) => {
  let w = monthWeights[c.month];
  if (c.isWeekend) w *= 1.45; // High weekend mall footfalls in Indian metros
  // High festive days in Oct/Nov
  if ((c.month === 10 || c.month === 11) && c.day >= 12 && c.day <= 25) {
    w *= 1.65; // Peak Dhanteras/Diwali gifting window
  }
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

// Indian category volume weights:
// Ethnic Apparel (36%), Electronics (24%), Personal Care/Ayurveda (18%), Home/Kitchen (14%), Sports (8%)
const categoryWeights: Record<string, number> = {
  "Ethnic & Modern Apparel": 0.36,
  "Electronics & Gadgets": 0.24,
  "Personal Care & Ayurveda": 0.18,
  "Home & Kitchen": 0.14,
  "Sports & Fitness": 0.08,
};
const productWeights = productsList.map((p) => categoryWeights[p.category] || 0.1);
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
  const rank = Math.floor(Math.pow(Math.random(), 2.2) * customerIds.length);
  return customerIds[Math.min(rank, customerIds.length - 1)];
}

const quantities = [1, 1, 1, 2, 2, 3, 4, 5];
const discountRates = [0.0, 0.0, 0.05, 0.10, 0.15, 0.20, 0.25];

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
      
      const extPrice = Math.round(prod.retailPrice * qty);
      const discAmt = Math.round(extPrice * discPct);
      const netRev = extPrice - discAmt;
      const totCost = Math.round(prod.unitCost * qty);
      const profit = netRev - totCost;
      const shipping = netRev >= 999 ? 0.0 : (qty <= 2 ? 49.0 : 99.0); // ₹49 or ₹99; free delivery >= ₹999

      insertFact.run(
        txId, orderId, cal.dateStr, cal.dateKey, storeId, prod.id, custId,
        qty, prod.retailPrice, prod.unitCost, discPct, discAmt, netRev,
        totCost, profit, shipping
      );
      txCount++;
    }
  })();
}

const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
console.log(`✅ Indian Retail Seeding Complete! Loaded ${txCount.toLocaleString()} transactions across Star Schema in ${elapsed}s.`);
