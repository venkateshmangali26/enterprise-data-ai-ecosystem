import React from "react";
import { OverviewKPIs } from "../types";
import { formatINR, formatINRAmount } from "../utils/formatters";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Percent,
  CreditCard,
  IndianRupee,
} from "lucide-react";

interface KPICardsProps {
  kpis: OverviewKPIs | null;
  isLoading: boolean;
}

type TrendType = "positive" | "negative" | "neutral";

export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
  isLoading,
}) => {
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

  const hasMom =
    kpis.mom_growth_pct !== null &&
    kpis.mom_growth_pct !== undefined &&
    Number.isFinite(kpis.mom_growth_pct);

  const momValue = hasMom ? kpis.mom_growth_pct! : null;

  const momTrendText =
    momValue === null
      ? "N/A MoM"
      : `${momValue > 0 ? "+" : ""}${momValue.toFixed(2)}% MoM`;

  const momTrendType: TrendType =
    momValue === null
      ? "neutral"
      : momValue > 0
        ? "positive"
        : momValue < 0
          ? "negative"
          : "neutral";

  const profitMargin = Number.isFinite(kpis.profit_margin_pct)
    ? kpis.profit_margin_pct
    : 0;

  const totalOrders = kpis.total_orders || 0;
  const activeCustomers = kpis.active_customers || 0;
  const avgItemsPerOrder = totalOrders > 0 ? (kpis.total_units_sold / totalOrders).toFixed(1) : "0.0";
  const ordersPerCustomer = activeCustomers > 0 ? (totalOrders / activeCustomers).toFixed(1) : "0.0";

  const cards = [
    {
      title: "Total Net Revenue",
      value: formatINR(kpis.total_revenue),
      subtext: `Cost of Goods: ${formatINR(kpis.total_cost)}`,
      trend: momTrendText,
      trendType: momTrendType,
      icon: IndianRupee,
      metaLabel: "Gross Margin Share",
      metaValue: `${profitMargin.toFixed(1)}%`,
      barPercent: Math.min(100, Math.max(0, Math.round(profitMargin))),
      barColor: "bg-orange-500",
      showBar: true,
    },
    {
      title: "Gross Profit",
      value: formatINR(kpis.gross_profit),
      subtext: `${profitMargin.toFixed(2)}% Operational Gross Margin`,
      trend: `${profitMargin.toFixed(2)}% Margin`,
      trendType: (profitMargin >= 20 ? "positive" : profitMargin > 0 ? "neutral" : "negative") as TrendType,
      icon: Percent,
      metaLabel: "Margin Health",
      metaValue: profitMargin >= 0 ? `${profitMargin.toFixed(1)}%` : `${profitMargin.toFixed(1)}% (Negative)`,
      barPercent: Math.min(100, Math.max(0, Math.round(profitMargin))),
      barColor: "bg-emerald-500",
      showBar: true,
    },
    {
      title: "Average Order Value (AOV)",
      value: formatINRAmount(kpis.average_order_value),
      subtext: `${totalOrders.toLocaleString("en-IN")} Total Orders`,
      trend: totalOrders > 0 ? `${avgItemsPerOrder} Items/Order` : "N/A",
      trendType: "neutral" as TrendType,
      icon: CreditCard,
      metaLabel: "Avg Basket Size",
      metaValue: `${avgItemsPerOrder} units`,
      barPercent: 0,
      barColor: "bg-blue-500",
      showBar: false,
    },
    {
      title: "Active Customers",
      value: activeCustomers.toLocaleString("en-IN"),
      subtext: `${ordersPerCustomer} Orders / Customer`,
      trend: `${Number.isFinite(kpis.avg_discount_pct) ? kpis.avg_discount_pct.toFixed(2) : "0.00"}% Avg Discount`,
      trendType: "neutral" as TrendType,
      icon: Users,
      metaLabel: "Repeat Frequency",
      metaValue: `${ordersPerCustomer} orders`,
      barPercent: 0,
      barColor: "bg-purple-500",
      showBar: false,
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

                {card.trendType !== "neutral" && (
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                      card.trendType === "positive"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                    }`}
                  >
                    {card.trendType === "positive" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{card.trend}</span>
                  </div>
                )}
              </div>

              {card.trendType === "neutral" && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {card.trend}
                </p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                <span>{card.subtext}</span>
                <span className="font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  {card.metaValue}
                </span>
              </div>

              {card.showBar ? (
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${card.barColor} transition-all duration-500`}
                    style={{ width: `${card.barPercent}%` }}
                  />
                </div>
              ) : (
                <div className="h-1.5" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
