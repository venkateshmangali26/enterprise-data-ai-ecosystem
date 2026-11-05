import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { KPICards } from "./components/KPICards";
import { RevenueChart } from "./components/RevenueChart";
import { StoreRankings } from "./components/StoreRankings";
import { CustomerSegments } from "./components/CustomerSegments";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { TransactionsTable } from "./components/TransactionsTable";
import { InvestigationDrawer } from "./components/InvestigationDrawer";
import { 
  OverviewKPIs, 
  RevenueTrendRow, 
  TopStoreRow, 
  RFMSegmentRow, 
  CategoryFinancialRow, 
  PaginatedTransactions, 
  TransactionItem 
} from "./types";
import { 
  FALLBACK_KPIS, 
  FALLBACK_TRENDS, 
  FALLBACK_STORES, 
  FALLBACK_SEGMENTS, 
  FALLBACK_CATEGORIES, 
  FALLBACK_TRANSACTIONS 
} from "./data/fallbackData";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Data states
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrendRow[]>([]);
  const [topStores, setTopStores] = useState<TopStoreRow[]>([]);
  const [customerSegments, setCustomerSegments] = useState<RFMSegmentRow[]>([]);
  const [categories, setCategories] = useState<CategoryFinancialRow[]>([]);
  
  // Transactions Table State
  const [transactions, setTransactions] = useState<PaginatedTransactions | null>(null);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Fetch overview & analytics data (with automatic offline / Vercel fallback)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const qRegion = selectedRegion !== "All" ? `&region=${encodeURIComponent(selectedRegion)}` : "";
      const qCategory = selectedCategory !== "All" ? `&category=${encodeURIComponent(selectedCategory)}` : "";

      const [kpiRes, revRes, storeRes, segRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/api/overview?_t=${Date.now()}${qRegion}${qCategory}`).catch(() => null),
        fetch(`${API_BASE}/api/revenue-trend?_t=${Date.now()}${qRegion}`).catch(() => null),
        fetch(`${API_BASE}/api/stores/top?limit=10${qRegion}`).catch(() => null),
        fetch(`${API_BASE}/api/customer-segments`).catch(() => null),
        fetch(`${API_BASE}/api/categories`).catch(() => null),
      ]);

      if (kpiRes && kpiRes.ok) {
        setKpis(await kpiRes.json());
      } else {
        setKpis(FALLBACK_KPIS);
      }

      if (revRes && revRes.ok) {
        setRevenueTrends(await revRes.json());
      } else {
        setRevenueTrends(selectedRegion === "All" ? FALLBACK_TRENDS : FALLBACK_TRENDS.filter(t => t.region === selectedRegion));
      }

      if (storeRes && storeRes.ok) {
        setTopStores(await storeRes.json());
      } else {
        setTopStores(selectedRegion === "All" ? FALLBACK_STORES : FALLBACK_STORES.filter(s => s.region === selectedRegion));
      }

      if (segRes && segRes.ok) {
        setCustomerSegments(await segRes.json());
      } else {
        setCustomerSegments(FALLBACK_SEGMENTS);
      }

      if (catRes && catRes.ok) {
        setCategories(await catRes.json());
      } else {
        setCategories(selectedCategory === "All" ? FALLBACK_CATEGORIES : FALLBACK_CATEGORIES.filter(c => c.category === selectedCategory));
      }
    } catch (err) {
      console.warn("API request failed, falling back to static offline metrics for Vercel:", err);
      setKpis(FALLBACK_KPIS);
      setRevenueTrends(FALLBACK_TRENDS);
      setTopStores(FALLBACK_STORES);
      setCustomerSegments(FALLBACK_SEGMENTS);
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion, selectedCategory]);

  // Fetch paginated transactions (with interactive offline / Vercel fallback)
  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search: searchQuery,
        region: selectedRegion,
        category: selectedCategory,
        sortBy,
        sortDir,
      });
      const res = await fetch(`${API_BASE}/api/transactions?${params.toString()}`).catch(() => null);
      if (res && res.ok) {
        setTransactions(await res.json());
      } else {
        let filtered = [...FALLBACK_TRANSACTIONS.items];
        if (selectedRegion !== "All") filtered = filtered.filter(t => t.region === selectedRegion);
        if (selectedCategory !== "All") filtered = filtered.filter(t => t.category === selectedCategory);
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
            t.order_id.toLowerCase().includes(q) || 
            t.customer_name.toLowerCase().includes(q) || 
            t.product_name.toLowerCase().includes(q)
          );
        }
        setTransactions({
          page,
          limit: 15,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / 15)),
          items: filtered.slice((page - 1) * 15, page * 15)
        });
      }
    } catch (err) {
      console.warn("Transactions API failed, using fallback data:", err);
      setTransactions(FALLBACK_TRANSACTIONS);
    }
  }, [page, searchQuery, selectedRegion, selectedCategory, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navigation Bar */}
      <Navbar
        isDark={isDark}
        toggleTheme={toggleTheme}
        onRefresh={() => {
          fetchData();
          fetchTransactions();
        }}
        isLoading={isLoading}
        selectedRegion={selectedRegion}
        onRegionChange={(r) => {
          setSelectedRegion(r);
          setPage(1);
        }}
        selectedCategory={selectedCategory}
        onCategoryChange={(c) => {
          setSelectedCategory(c);
          setPage(1);
        }}
        totalTransactions={transactions?.total ?? 150000}
      />

      {/* Main Dashboard View */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* 1. Executive Summary KPI Cards */}
        <KPICards kpis={kpis} isLoading={isLoading} />

        {/* 2. Analytical Charts Row (Query 1: MoM Revenue Growth & YTD) */}
        <div className="grid grid-cols-1 gap-6">
          <RevenueChart
            data={revenueTrends}
            isDark={isDark}
            selectedRegion={selectedRegion}
          />
        </div>

        {/* 3. Deep Analytical Insights Split: Store Efficiency & Customer RFM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StoreRankings
            stores={topStores}
            isLoading={isLoading}
            onSelectStore={(id) => {
              setSearchQuery(id);
              setPage(1);
            }}
          />

          <CustomerSegments
            segments={customerSegments}
            isDark={isDark}
            isLoading={isLoading}
          />
        </div>

        {/* 4. Category Financial Breakdown */}
        <div className="grid grid-cols-1 gap-6">
          <CategoryBreakdown
            categories={categories}
            isDark={isDark}
            isLoading={isLoading}
          />
        </div>

        {/* 5. Star Schema Fact Transactions Explorer Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Transaction Line Item Explorer
            </h2>
            <span className="text-xs text-zinc-500">
              Interactive Star Schema Fact Records
            </span>
          </div>
          <TransactionsTable
            data={transactions}
            page={page}
            onPageChange={setPage}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setPage(1);
            }}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSort}
            selectedTransactionId={selectedTransaction?.transaction_id}
            onSelectTransaction={(item) => setSelectedTransaction(item)}
            isLoading={isLoading}
          />
        </div>

      </main>

      {/* Investigation Drawer Side Panel */}
      <InvestigationDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />

    </div>
  );
}

export default App;

