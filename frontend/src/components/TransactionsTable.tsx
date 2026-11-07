import React from "react";
import { PaginatedTransactions, TransactionItem } from "../types";
import { 
  Search, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight, 
  ArrowUpDown,
  Eye,
  X
} from "lucide-react";

interface TransactionsTableProps {
  data: PaginatedTransactions | null;
  page: number;
  onPageChange: (p: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (col: string) => void;
  selectedTransactionId?: string;
  onSelectTransaction: (item: TransactionItem) => void;
  isLoading: boolean;
  selectedStoreId?: string;
  onClearStore?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  data,
  page,
  onPageChange,
  searchQuery,
  onSearchChange,
  sortBy,
  sortDir,
  onSortChange,
  selectedTransactionId,
  onSelectTransaction,
  isLoading,
  selectedStoreId,
  onClearStore,
}) => {
  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  const segmentBadges: Record<string, string> = {
    "Retail Consumer": "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900",
    "Corporate & Enterprise": "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900",
    "SME & Kirana": "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-900",
  };

  return (
    <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      
      {/* Table Toolbar */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, Store, or Product..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
            />
          </div>

          {selectedStoreId && selectedStoreId !== "All" && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-800">
              <span>Store: {selectedStoreId}</span>
              {onClearStore && (
                <button
                  onClick={onClearStore}
                  className="hover:text-orange-950 dark:hover:text-white"
                  title="Clear store filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <span className="text-xs font-mono text-zinc-500 hidden md:inline">
            {totalCount.toLocaleString("en-IN")} transactions matched
          </span>
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <span>Click any row to open the <b>Transaction Inspector</b></span>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto min-h-[380px]">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur z-10 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-semibold">Order / Date</th>
              <th className="py-3 px-4 font-semibold">Customer & Segment</th>
              <th className="py-3 px-4 font-semibold">Product Line</th>
              <th className="py-3 px-4 font-semibold">Store Location</th>
              <th 
                className="py-3 px-4 font-semibold cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200"
                onClick={() => onSortChange("quantity")}
              >
                <div className="flex items-center gap-1">
                  <span>Qty</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 font-semibold cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right"
                onClick={() => onSortChange("net_revenue")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Net Revenue (₹)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                className="py-3 px-4 font-semibold cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right"
                onClick={() => onSortChange("gross_profit")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Gross Profit (₹)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-right">Margin %</th>
              <th className="py-3 px-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={9} className="py-4 px-4">
                    <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-400">
                  No transactions match your search filter criteria.
                </td>
              </tr>
            ) : (
              items.map((t) => {
                const isSelected = t.transaction_id === selectedTransactionId;
                return (
                  <tr
                    key={t.transaction_id}
                    onClick={() => onSelectTransaction(t)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-orange-50/80 dark:bg-orange-950/30 text-orange-950 dark:text-orange-50 font-medium"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                        {t.order_id}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {t.order_date}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.customer_name}
                      </div>
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded-full border mt-0.5 ${segmentBadges[t.customer_segment] || "bg-zinc-100 dark:bg-zinc-800"}`}>
                        {t.customer_segment}
                      </span>
                    </td>

                    <td className="py-3 px-4 max-w-[200px] truncate">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate" title={t.product_name}>
                        {t.product_name}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {t.category} · {t.sub_category}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-900 dark:text-zinc-100">
                        {t.store_name}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {t.region} · {t.store_id}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {t.quantity}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-50">
                      ₹{Math.round(t.net_revenue).toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Math.round(t.gross_profit).toLocaleString("en-IN")}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {t.profit_margin_pct}%
                        </span>
                        <div className="w-10 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, (t.profit_margin_pct || 0) * 2.2))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-zinc-600 dark:text-zinc-300 hover:text-orange-600 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <div>
          Showing page <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">{page}</span> of{" "}
          <span className="font-semibold font-mono text-zinc-900 dark:text-zinc-100">{totalPages}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            title="First Page"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            title="Previous Page"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            title="Next Page"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            title="Last Page"
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
