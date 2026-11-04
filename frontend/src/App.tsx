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

  // Fetch overview & analytics data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const qRegion = selectedRegion !== "All" ? `&region=${encodeURIComponent(selectedRegion)}` : "";
      const qCategory = selectedCategory !== "All" ? `&category=${encodeURIComponent(selectedCategory)}` : "";

      const [kpiRes, revRes, storeRes, segRes, catRes] = await Promise.all([
        fetch(`/api/overview?_t=${Date.now()}${qRegion}${qCategory}`),
        fetch(`/api/revenue-trend?_t=${Date.now()}${qRegion}`),
        fetch(`/api/stores/top?limit=10${qRegion}`),
        fetch(`/api/customer-segments`),
        fetch(`/api/categories`),
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (revRes.ok) setRevenueTrends(await revRes.json());
      if (storeRes.ok) setTopStores(await storeRes.json());
      if (segRes.ok) setCustomerSegments(await segRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error("Failed to fetch analytical datasets:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion, selectedCategory]);

  // Fetch paginated transactions
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
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
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

