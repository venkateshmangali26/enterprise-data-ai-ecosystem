import React from "react";
import { TopStoreRow } from "../types";
import { formatINR } from "../utils/formatters";
import { Award } from "lucide-react";

interface StoreRankingsProps {
  stores: TopStoreRow[];
  isLoading: boolean;
  onSelectStore?: (storeId: string) => void;
}

export const StoreRankings: React.FC<StoreRankingsProps> = ({
  stores,
  isLoading,
  onSelectStore,
}) => {
  const storeTypeBadgeColors: Record<string, string> = {
    Flagship: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    Standard: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    Outlet: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    Mall: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    Express: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] animate-pulse h-96" />
    );
  }

  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Query 2: Top 10 Indian Stores (Margin & Volume)
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Pan-India Leaderboard
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ranked by profit margin % and unit throughput with retail density (₹/sqft).
            </p>
          </div>
          <Award className="w-5 h-5 text-amber-500" />
        </div>

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <th className="pb-2.5 font-semibold">Rank</th>
                <th className="pb-2.5 font-semibold">Store Location</th>
                <th className="pb-2.5 font-semibold">Format</th>
                <th className="pb-2.5 font-semibold text-right">Profit Margin</th>
                <th className="pb-2.5 font-semibold text-right">Units Sold</th>
                <th className="pb-2.5 font-semibold text-right">Net Revenue</th>
                <th className="pb-2.5 font-semibold text-right">Sales / SqFt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {stores.map((s, idx) => (
                <tr
                  key={s.store_id}
                  onClick={() => onSelectStore?.(s.store_id)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-2.5 font-mono font-bold text-zinc-400 group-hover:text-orange-500">
                    #{idx + 1}
                  </td>
                  <td className="py-2.5">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {s.store_name}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {s.city}, {s.state} · <span className="font-mono text-zinc-400">{s.region}</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        storeTypeBadgeColors[s.store_type] || "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {s.store_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {s.profit_margin_pct}%
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(100, s.profit_margin_pct * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-zinc-700 dark:text-zinc-300">
                    {s.total_volume_sold?.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatINR(s.total_revenue)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-orange-600 dark:text-orange-400">
                    ₹{s.revenue_per_sqft?.toLocaleString("en-IN")}/ft²
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
