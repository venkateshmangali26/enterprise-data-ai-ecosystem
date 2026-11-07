import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { RevenueTrendRow } from "../types";

interface RevenueChartProps {
  data: RevenueTrendRow[];
  isDark: boolean;
  selectedRegion: string;
}

interface EChartsTooltipItem {
  dataIndex: number;
  seriesName?: string;
  value?: number | string;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isDark,
  selectedRegion,
}) => {
  const availableYears = useMemo(
    () => [...new Set(data.map((row) => row.year))].filter(Boolean).sort((a, b) => a - b),
    [data]
  );

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const activeYear =
    selectedYear !== null && availableYears.includes(selectedYear)
      ? selectedYear
      : availableYears[availableYears.length - 1] ?? 2025;

  const displayYears = availableYears.length > 0 ? availableYears : [2023, 2024, 2025];

  // Aggregate monthly revenue by calendar month for the active year and selected region
  const monthlyAgg = useMemo(() => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const totals = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      monthName: monthNames[index],
      revenue: 0,
      orders: 0,
    }));

    data
      .filter((row) => {
        const matchesYear = row.year === activeYear;
        const matchesRegion = !selectedRegion || selectedRegion === "All" || row.region === selectedRegion;
        return matchesYear && matchesRegion;
      })
      .forEach((row) => {
        const index = row.month - 1;
        if (index < 0 || index > 11) return;

        totals[index].revenue += Number(row.monthly_revenue) || 0;
        totals[index].orders += Number(row.order_count) || 0;

        if (row.month_short) {
          totals[index].monthName = row.month_short;
        }
      });

    let runningYtd = 0;

    return totals.map((item, index) => {
      runningYtd += item.revenue;

      let previousRevenue: number | null = null;
      if (index > 0) {
        previousRevenue = totals[index - 1].revenue;
      } else {
        // Cross-year transition: For January (index 0), look up December of the preceding year (activeYear - 1)
        const priorDecRows = data.filter((row) => {
          const matchesPrevYear = row.year === activeYear - 1;
          const matchesMonth = row.month === 12;
          const matchesRegion = !selectedRegion || selectedRegion === "All" || row.region === selectedRegion;
          return matchesPrevYear && matchesMonth && matchesRegion;
        });
        if (priorDecRows.length > 0) {
          const sumPriorDec = priorDecRows.reduce((sum, r) => sum + (Number(r.monthly_revenue) || 0), 0);
          if (sumPriorDec > 0) {
            previousRevenue = sumPriorDec;
          }
        }
      }

      const momPct =
        previousRevenue !== null && previousRevenue > 0
          ? Number(
              (
                ((item.revenue - previousRevenue) / previousRevenue) * 100
              ).toFixed(1)
            )
          : null;

      return {
        ...item,
        revenue: Number(item.revenue.toFixed(2)),
        ytd: Number(runningYtd.toFixed(2)),
        momPct,
      };
    });
  }, [data, activeYear, selectedRegion]);

  const option = useMemo(() => {
    const textColor = isDark ? "#a1a1aa" : "#71717a";
    const splitLineColor = isDark ? "#1f1f23" : "#f4f4f5";
    const axisLineColor = isDark ? "#27272a" : "#e4e4e7";

    const months = monthlyAgg.map((d) => d.monthName);
    const revenues = monthlyAgg.map((d) => d.revenue / 10_000_000); // in Crores (numeric)
    const ytds = monthlyAgg.map((d) => d.ytd / 10_000_000); // in Crores (numeric)

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: isDark ? "#27272a" : "#e4e4e7",
        textStyle: { color: isDark ? "#fafafa" : "#09090b", fontSize: 12 },
        formatter: (params: unknown) => {
          const pList = Array.isArray(params) ? (params as EChartsTooltipItem[]) : [];
          if (!pList.length) return "";
          const idx = pList[0].dataIndex;
          const item = monthlyAgg[idx];
          if (!item) return "";

          const isFestivePeak = item.month === 10 || item.month === 11;
          const momText =
            item.momPct === null
              ? "N/A"
              : `${item.momPct >= 0 ? "+" : ""}${item.momPct}%`;
          const momColor =
            item.momPct === null
              ? "#a1a1aa"
              : item.momPct >= 0
              ? "#10b981"
              : "#f43f5e";

          return `
            <div style="font-weight: 600; margin-bottom: 4px; font-family: monospace;">
              ${item.monthName} ${activeYear} ${isFestivePeak ? "🪔 (Festive Diwali Peak)" : ""}
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:#f97316">● Monthly Net Revenue:</span>
              <span style="font-weight:bold">₹${(item.revenue / 10_000_000).toFixed(2)} Cr</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:#10b981">● Running YTD:</span>
              <span style="font-weight:bold">₹${(item.ytd / 10_000_000).toFixed(2)} Cr</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px;">
              <span style="color:${momColor}">● MoM Growth:</span>
              <span style="font-weight:bold">${momText}</span>
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
  }, [monthlyAgg, isDark, activeYear]);

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
            Annual calendar-year performance tracking monthly sales momentum, December-to-January transitions, and festive peaks.
          </p>
        </div>

        {/* Dynamic Year Selector Pills */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {displayYears.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeYear === y
                  ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {y}
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
