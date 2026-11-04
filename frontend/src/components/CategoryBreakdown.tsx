import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { CategoryFinancialRow } from "../types";
import { PackageOpen } from "lucide-react";

interface CategoryBreakdownProps {
  categories: CategoryFinancialRow[];
  isDark: boolean;
  isLoading: boolean;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  isDark,
  isLoading,
}) => {
  // Aggregate by main Category
  const categoryAgg = useMemo(() => {
    const map = new Map<string, {
      category: string;
      revenue: number;
      profit: number;
      units: number;
      subcategories: string[];
    }>();

    categories.forEach((c) => {
      const existing = map.get(c.category) || {
        category: c.category,
        revenue: 0,
        profit: 0,
        units: 0,
        subcategories: [],
      };
      existing.revenue += c.total_revenue;
      existing.profit += c.gross_profit;
      existing.units += c.total_units_sold;
      if (!existing.subcategories.includes(c.sub_category)) {
        existing.subcategories.push(c.sub_category);
      }
      map.set(c.category, existing);
    });

    return Array.from(map.values()).map((c) => ({
      ...c,
      marginPct: Math.round((c.profit / c.revenue) * 1000) / 10,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [categories]);

  const chartOption = useMemo(() => {
    const textColor = isDark ? "#a1a1aa" : "#71717a";
    const splitLineColor = isDark ? "#1f1f23" : "#f4f4f5";
    const names = categoryAgg.map((c) => c.category);
    const revenues = categoryAgg.map((c) => (c.revenue / 1_000_000).toFixed(2));
    const margins = categoryAgg.map((c) => c.marginPct);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: isDark ? "#27272a" : "#e4e4e7",
        textStyle: { color: isDark ? "#fafafa" : "#09090b", fontSize: 12 },
        formatter: (params: any) => {
          if (!params.length) return "";
          const idx = params[0].dataIndex;
          const item = categoryAgg[idx];
          return `
            <div style="font-weight:600; font-family:monospace;">${item.category}</div>
            <div style="margin-top:4px;">Revenue: <b>$${(item.revenue / 1_000_000).toFixed(2)}M</b></div>
            <div>Gross Profit: <b>$${(item.profit / 1_000_000).toFixed(2)}M</b></div>
            <div>Profit Margin: <b style="color:#10b981">${item.marginPct}%</b></div>
            <div style="font-size:11px; color:#a1a1aa;">Units Sold: ${item.units.toLocaleString()}</div>
          `;
        },
      },
      legend: {
        data: ["Revenue ($M)", "Profit Margin %"],
        textStyle: { color: textColor },
        top: 0,
        right: 10,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "8%",
        top: "14%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: names,
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: isDark ? "#27272a" : "#e4e4e7" } },
      },
      yAxis: [
        {
          type: "value",
          name: "Revenue ($M)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "${value}M", fontSize: 10 },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        {
          type: "value",
          name: "Margin %",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: { color: textColor, formatter: "{value}%", fontSize: 10 },
          splitLine: { show: false },
          max: 80,
        },
      ],
      series: [
        {
          name: "Revenue ($M)",
          type: "bar",
          data: revenues,
          barMaxWidth: 36,
          itemStyle: {
            color: "#6366f1",
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: "Profit Margin %",
          type: "line",
          yAxisIndex: 1,
          data: margins,
          symbolSize: 8,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3, color: "#10b981" },
        },
      ],
    };
  }, [categoryAgg, isDark]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] animate-pulse h-80" />
    );
  }

  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            Category Financial Performance & Margins
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Cross-category revenue scale versus gross margin profitability.
          </p>
        </div>
        <PackageOpen className="w-5 h-5 text-indigo-500" />
      </div>

      <div className="h-[280px] w-full">
        <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
};

