import React from "react";
import { OverviewKPIs } from "../types";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Users, 
  Package, 
  Percent, 
  CreditCard 
} from "lucide-react";

interface KPICardsProps {
  kpis: OverviewKPIs | null;
  isLoading: boolean;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, isLoading }) => {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] animate-pulse space-y-3"
          >
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-36 bg-zinc-300 dark:bg-zinc-700 rounded" />
            <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`;
    return `$${val.toFixed(2)}`;
  };

  const isMomPositive = (kpis.mom_growth_pct ?? 0) >= 0;

  const cards = [
    {
      title: "Total Net Revenue",
      value: formatCurrency(kpis.total_revenue),
      subtext: `COGS: ${formatCurrency(kpis.total_cost)}`,
      trend: `${isMomPositive ? "+" : ""}${kpis.mom_growth_pct}% MoM`,
      isPositive: isMomPositive,
      icon: DollarSign,
      barPercent: Math.min(100, Math.max(10, Math.round((kpis.gross_profit / kpis.total_revenue) * 100))),
      barColor: "bg-blue-500",
    },
    {
      title: "Gross Profit & Margin",
      value: formatCurrency(kpis.gross_profit),
      subtext: `${kpis.profit_margin_pct}% Profit Margin`,
      trend: `${kpis.profit_margin_pct}% Margin`,
      isPositive: kpis.profit_margin_pct >= 35,
      icon: Percent,
      barPercent: Math.min(100, Math.round(kpis.profit_margin_pct * 1.3)),
      barColor: "bg-emerald-500",
    },
    {
      title: "Average Order Value (AOV)",
      value: `$${kpis.average_order_value?.toFixed(2) ?? "0.00"}`,
      subtext: `${kpis.total_orders?.toLocaleString()} Total Orders`,
      trend: `${(kpis.total_units_sold / (kpis.total_orders || 1)).toFixed(1)} Items/Order`,
      isPositive: true,
      icon: CreditCard,
      barPercent: Math.min(100, Math.round((kpis.average_order_value / 250) * 100)),
      barColor: "bg-amber-500",
    },
    {
      title: "Active Customer Base",
      value: kpis.active_customers?.toLocaleString() ?? "0",
      subtext: `${(kpis.total_orders / (kpis.active_customers || 1)).toFixed(1)} Orders / Customer`,
      trend: `${kpis.avg_discount_pct}% Avg Discount`,
      isPositive: true,
      icon: Users,
      barPercent: 78,
      barColor: "bg-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {card.title}
                </span>
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-950 dark:text-zinc-50">
                  {card.value}
                </span>
                
                {/* Trend pill indicator */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                    card.isPositive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {card.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{card.trend}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>{card.subtext}</span>
                <span className="font-mono text-[11px]">{card.barPercent}%</span>
              </div>
              {/* Sparkline progress indicator */}
              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.barColor} transition-all duration-500`}
                  style={{ width: `${card.barPercent}%` }}
                />
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};

