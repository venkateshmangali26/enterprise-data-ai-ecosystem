import React, { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { RFMSegmentRow } from "../types";
import { Users2, ShieldCheck, HeartHandshake, AlertTriangle, Moon } from "lucide-react";

interface CustomerSegmentsProps {
  segments: RFMSegmentRow[];
  isDark: boolean;
  isLoading: boolean;
}

export const CustomerSegments: React.FC<CustomerSegmentsProps> = ({
  segments,
  isDark,
  isLoading,
}) => {
  const segmentIcons: Record<string, string> = {
    Champions: "🏆",
    "Loyal Customers": "💎",
    "Potential Loyalists": "🚀",
    "Recent Customers": "🌱",
    "At Risk": "⚠️",
    "Cannot Lose Them": "🚨",
    "Hibernating / Lost": "💤",
    "Needs Attention": "👀",
  };

  const chartOption = useMemo(() => {
    const textColor = isDark ? "#fafafa" : "#09090b";
    const subColor = isDark ? "#a1a1aa" : "#71717a";

    const colors = [
      "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", 
      "#ec4899", "#ef4444", "#64748b", "#06b6d4"
    ];

    const pieData = segments.map((s, idx) => ({
      name: s.rfm_segment,
      value: s.total_segment_revenue,
      customerShare: s.customer_share_pct,
      customers: s.total_customers,
      itemStyle: { color: colors[idx % colors.length] },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "#18181b" : "#ffffff",
        borderColor: isDark ? "#27272a" : "#e4e4e7",
        textStyle: { color: textColor, fontSize: 12 },
        formatter: (p: any) => {
          return `
            <div style="font-weight:600; font-family:monospace;">${p.name}</div>
            <div style="margin-top:4px;">Revenue: <b>$${(p.value / 1_000_000).toFixed(2)}M</b> (${p.percent}%)</div>
            <div>Customers: <b>${p.data.customers.toLocaleString()}</b> (${p.data.customerShare}%)</div>
          `;
        },
      },
      legend: {
        orient: "vertical",
        right: "5%",
        top: "center",
        textStyle: { color: subColor, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          name: "Segment Revenue Share",
          type: "pie",
          radius: ["50%", "78%"],
          center: ["38%", "50%"],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: "bold",
              color: textColor,
            },
          },
          data: pieData,
        },
      ],
    };
  }, [segments, isDark]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] animate-pulse h-96" />
    );
  }

  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              Query 3: Customer RFM Segmentation
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              Behavioral Quintiles
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Recency (days), Frequency (orders), and Monetary (spend) profiling across 10,000 customers.
          </p>
        </div>
        <Users2 className="w-5 h-5 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* ECharts Donut Chart */}
        <div className="lg:col-span-6 h-[260px] w-full">
          <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Detailed Segment Stats Grid */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
          {segments.map((seg) => (
            <div
              key={seg.rfm_segment}
              className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <span>{segmentIcons[seg.rfm_segment] || "👤"}</span>
                  {seg.rfm_segment}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                  {seg.revenue_contribution_pct}% Rev
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                <div>
                  <div className="text-[10px] text-zinc-400">Custs</div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">{seg.total_customers}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">Recency</div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">{seg.avg_recency_days}d</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">Avg Spend</div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">${(seg.avg_monetary_spend / 1000).toFixed(1)}k</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

