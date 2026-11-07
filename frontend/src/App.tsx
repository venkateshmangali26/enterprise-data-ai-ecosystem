import React, { useState, useEffect, useCallback, useRef } from "react";
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

// Token resolution from session storage only (no secrets baked into frontend bundle)
const getAuthHeaders = (): HeadersInit => {
  if (typeof window !== "undefined") {
    const token = window.sessionStorage.getItem("retail_api_token");
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
};

export function App() {
  const [isDark, setIsDark] = useState<boolean>(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("All");

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

  // Independent loading states
  const [isOverviewLoading, setIsOverviewLoading] = useState<boolean>(true);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState<boolean>(true);

  // Connection & Data Source Status
  const [isLiveDatabase, setIsLiveDatabase] = useState<boolean>(true);

  // AbortController refs to prevent race conditions from out-of-order responses
  const dataAbortRef = useRef<AbortController | null>(null);
  const txAbortRef = useRef<AbortController | null>(null);

  // Sync theme class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Fetch overview & analytics data with race condition protection
  const fetchData = useCallback(async () => {
    if (dataAbortRef.current) {
      dataAbortRef.current.abort();
    }
    const controller = new AbortController();
    dataAbortRef.current = controller;

    setIsOverviewLoading(true);
    try {
      const qRegion = selectedRegion !== "All" ? `&region=${encodeURIComponent(selectedRegion)}` : "";
      const qCategory = selectedCategory !== "All" ? `&category=${encodeURIComponent(selectedCategory)}` : "";

      const authHeaders = getAuthHeaders();
      const signal = controller.signal;

      const [kpiRes, revRes, storeRes, segRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/api/overview?_t=${Date.now()}${qRegion}${qCategory}`, { headers: authHeaders, signal }).catch(() => null),
        fetch(`${API_BASE}/api/revenue-trend?_t=${Date.now()}${qRegion}`, { headers: authHeaders, signal }).catch(() => null),
        fetch(`${API_BASE}/api/stores/top?limit=10${qRegion}`, { headers: authHeaders, signal }).catch(() => null),
        fetch(`${API_BASE}/api/customer-segments?_t=${Date.now()}`, { headers: authHeaders, signal }).catch(() => null),
        fetch(`${API_BASE}/api/categories?_t=${Date.now()}${qCategory}${qRegion}`, { headers: authHeaders, signal }).catch(() => null),
      ]);

      if (signal.aborted) return;

      const hasLiveResponses = [kpiRes, revRes, storeRes, segRes, catRes].some(
        (r) => r !== null && r.ok
      );

      if (hasLiveResponses) {
        setIsLiveDatabase(true);

        if (kpiRes && kpiRes.ok) setKpis(await kpiRes.json());
        if (revRes && revRes.ok) setRevenueTrends(await revRes.json());
        if (storeRes && storeRes.ok) setTopStores(await storeRes.json());
        if (segRes && segRes.ok) setCustomerSegments(await segRes.json());
        if (catRes && catRes.ok) setCategories(await catRes.json());
      } else {
        // Fallback to static offline data
        setIsLiveDatabase(false);
        setKpis(FALLBACK_KPIS);
        setRevenueTrends(selectedRegion === "All" ? FALLBACK_TRENDS : FALLBACK_TRENDS.filter(t => t.region === selectedRegion));
        setTopStores(selectedRegion === "All" ? FALLBACK_STORES : FALLBACK_STORES.filter(s => s.region === selectedRegion));
        setCustomerSegments(FALLBACK_SEGMENTS);
        setCategories(selectedCategory === "All" ? FALLBACK_CATEGORIES : FALLBACK_CATEGORIES.filter(c => c.category === selectedCategory));
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setIsLiveDatabase(false);
      setKpis(FALLBACK_KPIS);
      setRevenueTrends(FALLBACK_TRENDS);
      setTopStores(FALLBACK_STORES);
      setCustomerSegments(FALLBACK_SEGMENTS);
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      setIsOverviewLoading(false);
    }
  }, [selectedRegion, selectedCategory]);

  // Fetch paginated transactions with store filtering and fallback sorting
  const fetchTransactions = useCallback(async () => {
    if (txAbortRef.current) {
      txAbortRef.current.abort();
    }
    const controller = new AbortController();
    txAbortRef.current = controller;

    setIsTransactionsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search: searchQuery,
        region: selectedRegion,
        category: selectedCategory,
        storeId: selectedStoreId,
        sortBy,
        sortDir,
      });

      const res = await fetch(`${API_BASE}/api/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
        signal: controller.signal,
      }).catch(() => null);

      if (controller.signal.aborted) return;

      if (res && res.ok) {
        const liveTx = await res.json();
        setTransactions(liveTx);
        setIsLiveDatabase(true);
      } else {
        // Safe offline fallback with sorting and filtering
        let filtered = [...FALLBACK_TRANSACTIONS.items];
        if (selectedRegion !== "All") filtered = filtered.filter(t => t.region === selectedRegion);
        if (selectedCategory !== "All") filtered = filtered.filter(t => t.category === selectedCategory);
        if (selectedStoreId !== "All") filtered = filtered.filter(t => t.store_id === selectedStoreId);

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
            t.order_id.toLowerCase().includes(q) || 
            t.customer_name.toLowerCase().includes(q) || 
            t.product_name.toLowerCase().includes(q) ||
            t.store_id.toLowerCase().includes(q) ||
            t.store_name.toLowerCase().includes(q)
          );
        }

        // Apply offline sorting
        filtered.sort((a, b) => {
          const valA = (a as unknown as Record<string, unknown>)[sortBy];
          const valB = (b as unknown as Record<string, unknown>)[sortBy];
          if (typeof valA === "number" && typeof valB === "number") {
            return sortDir === "asc" ? valA - valB : valB - valA;
          }
          return sortDir === "asc"
            ? String(valA ?? "").localeCompare(String(valB ?? ""))
            : String(valB ?? "").localeCompare(String(valA ?? ""));
        });

        setTransactions({
          page,
          limit: 15,
          total: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / 15)),
          items: filtered.slice((page - 1) * 15, page * 15)
        });
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setTransactions(FALLBACK_TRANSACTIONS);
    } finally {
      setIsTransactionsLoading(false);
    }
  }, [page, searchQuery, selectedRegion, selectedCategory, selectedStoreId, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
    return () => {
      if (dataAbortRef.current) dataAbortRef.current.abort();
    };
  }, [fetchData]);

  useEffect(() => {
    fetchTransactions();
    return () => {
      if (txAbortRef.current) txAbortRef.current.abort();
    };
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
        isLoading={isOverviewLoading || isTransactionsLoading}
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
        isLive={isLiveDatabase}
      />

      {/* Demo / Offline Notification Alert */}
      {!isLiveDatabase && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 px-4 py-2 text-xs text-center flex items-center justify-center gap-2">
          <span>⚡ Running in <b>Demo / Offline Mode</b>: Live SQLite API is unreachable or requires an access token. Showing pre-computed dataset.</span>
          <button
            onClick={() => {
              fetchData();
              fetchTransactions();
            }}
            className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Dashboard View */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* 1. Executive Summary KPI Cards */}
        <KPICards kpis={kpis} isLoading={isOverviewLoading} />

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
            isLoading={isOverviewLoading}
            onSelectStore={(id) => {
              setSelectedStoreId(id);
              setPage(1);
            }}
          />

          <CustomerSegments
            segments={customerSegments}
            isDark={isDark}
            isLoading={isOverviewLoading}
          />
        </div>

        {/* 4. Category Financial Breakdown */}
        <div className="grid grid-cols-1 gap-6">
          <CategoryBreakdown
            categories={categories}
            isDark={isDark}
            isLoading={isOverviewLoading}
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
            isLoading={isTransactionsLoading}
            selectedStoreId={selectedStoreId}
            onClearStore={() => {
              setSelectedStoreId("All");
              setPage(1);
            }}
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
