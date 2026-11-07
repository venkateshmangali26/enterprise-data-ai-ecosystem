import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { RevenueTrendRow } from "../types";

interface RevenueChartProps {
  data: RevenueTrendRow[];
  isDark: boolean;
  selectedRegion: string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isDark,
  selectedRegion,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  const filteredData = useMemo(() => {
    return data.filter((d) => d.year === selectedYear);
  }, [data, selectedYear]);

  // Aggregate monthly if "All" regions selected, or take specific region
  const monthlyAgg = useMemo(() => {
    const map = new Map<number, {
      monthName: string;
      revenue: number;
      prevRevenue: number;
      ytd: number;
      orders: number;
    }>();

    filteredData.forEach((row) => {
      const existing = map.get(row.month) || {
        monthName: row.month_short,
        revenue: 0,
        prevRevenue: 0,
        ytd: 0,
        orders: 0,
      };
      existing.revenue += row.monthly_revenue || 0;
      existing.prevRevenue += row.prev_month_revenue || 0;
      existing.ytd += row.running_ytd_revenue || 0;
      existing.orders += row.order_count;
      map.set(row.month, existing);
    });

    const sortedMonths = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
    return sortedMonths.map(([m, vals]) => {
      const momPct = vals.prevRevenue > 0
        ? Math.round(((vals.revenue - vals.prevRevenue) / vals.prevRevenue) * 1000) / 10
        : 0;
      return {
        month: m,
        monthName: vals.monthName,
        revenue: Math.round(vals.revenue),
        ytd: Math.round(vals.ytd),
        momPct,
        orders: vals.orders,
      };
    });
  }, [filteredData]);

  const option = useMemo(() => {
    const textColor = isDark ? "#a1a1aa" : "#71717a";
    const splitLineColor = isDark ? "#1f1f23" : "#f4f4f5";
    const axisLineColor = isDark ? "#27272a" : "#e4e4e7";

    const months = monthlyAgg.map((d) => d.monthName);
    const revenues = monthlyAgg.map((d) => (d.revenue / 10_000_000).toFixed(2)); // in Crores
    const ytds = monthlyAgg.map((d) => (d.ytd / 10_000_000).toFixed(2)); // in Crores

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: isDark ? "#27272a" : "#e4e4e7",
        textStyle: { color: isDark ? "#fafafa" : "#09090b", fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params.length) return "";
          const idx = params[0].dataIndex;
          const item = monthlyAgg[idx];
          const isFestivePeak = item.month === 10 || item.month === 11;
          return `
            <div style="font-weight: 600; margin-bottom: 4px; font-family: monospace;">
              ${item.monthName} ${selectedYear} ${isFestivePeak ? "🪔 (Festive Diwali Peak)" : ""}
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:#f97316">● Monthly GMV:</span>
              <span style="font-weight:bold">₹${(item.revenue / 10_000_000).toFixed(2)} Cr</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:#10b981">● Running YTD:</span>
              <span style="font-weight:bold">₹${(item.ytd / 10_000_000).toFixed(2)} Cr</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:${item.momPct >= 0 ? '#10b981' : '#f43f5e'}">● MoM Growth:</span>
              <span style="font-weight:bold">${item.momPct >= 0 ? '+' : ''}${item.momPct}%</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px; margin-top:4px; font-size:11px; color:#a1a1aa">
              <span>Orders Dispatched:</span>
              <span>${item.orders.toLocaleString("en-IN")}</span>
            </div>
          `;
        },
      },
      legend: {
        data: ["Monthly Revenue", "Running YTD Revenue"],
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
        data: months,
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: { color: textColor, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Monthly (₹ Cr)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: {
            color: textColor,
            formatter: "₹{value} Cr",
            fontSize: 10,
          },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        {
          type: "value",
          name: "YTD (₹ Cr)",
          nameTextStyle: { color: textColor, fontSize: 11 },
          axisLabel: {
            color: textColor,
            formatter: "₹{value} Cr",
            fontSize: 10,
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: "Monthly Revenue",
          type: "bar",
          data: revenues,
          barMaxWidth: 32,
          itemStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "#f97316" }, // Indian Saffron/Orange
                { offset: 1, color: "#ea580c" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: "Running YTD Revenue",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 3, color: "#10b981" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.25)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
              ],
            },
          },
          data: ytds,
        },
      ],
    };
  }, [monthlyAgg, isDark, selectedYear]);

  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Query 1: MoM Revenue Growth & Running YTD (₹ Crores)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900">
              {selectedRegion === "All" ? "Pan-India Territories" : `${selectedRegion} Region`}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Window calculations tracking festive spikes (Diwali, Dhanteras, Navratri & Wedding season).
          </p>
        </div>

        {/* Year Selector Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {[2023, 2024, 2025].map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedYear === y
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              FY {y}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[340px] w-full">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
};
