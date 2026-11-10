import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
  Tooltip,
} from "recharts";
import { BarChart3, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { CategorySummaryItem, formatIndianCurrency } from "../../hooks/useReportCalculations";
import { useTheme } from "../../context/ThemeContext";
import { getChartThemeTokens } from "../../utils/themeChartUtils";
import { CategoryIcon } from "../transactions/categoryMeta";

interface CategoryBarChartProps {
  data: CategorySummaryItem[];
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeTokens = getChartThemeTokens(resolvedTheme);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[260px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
          <BarChart3 size={24} />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No expense records found for this period</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          Log transactions or adjust the date filter to populate category spending.
        </p>
      </div>
    );
  }

  const topCategory = data[0];
  const maxAmount = topCategory?.amount || 1;

  // Split top 5 and remainder if more than 6 categories
  const hasMoreThan6 = data.length > 6;
  const visibleCategories = hasMoreThan6 && !isExpanded ? data.slice(0, 5) : data;
  const otherCategories = hasMoreThan6 ? data.slice(5) : [];
  const othersTotalAmount = otherCategories.reduce((acc, c) => acc + c.amount, 0);
  const totalAllExpenses = data.reduce((acc, c) => acc + c.amount, 0);
  const othersPercentage = totalAllExpenses > 0 ? (othersTotalAmount / totalAllExpenses) * 100 : 0;

  // Desktop label renderer: Whole integer rupee format without Y-axis
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null || value === 0) return null;

    const formatted = formatIndianCurrency(value, false);

    return (
      <g>
        <text
          x={x + width / 2}
          y={Math.max(14, y - 10)}
          fill={isDark ? "#F8FAFC" : "#0F172A"}
          textAnchor="middle"
          fontSize={11}
          fontWeight={800}
          fontFamily="monospace"
        >
          {formatted}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-violet-950/50 text-blue-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Category-wise Spending
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by highest outflow with visible amounts
              </p>
            </div>
          </div>

          {topCategory && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 font-bold self-start sm:self-auto">
              <Crown size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span>
                Top: <strong>{topCategory.name}</strong> ({formatIndianCurrency(topCategory.amount, false)})
              </span>
            </div>
          )}
        </div>

        {/* 1. Mobile Layout (< 640px): HORIZONTAL BARS with no cutting, no Y-axis, no grid */}
        <div className="block sm:hidden space-y-3.5 pt-1">
          {visibleCategories.map((cat, idx) => {
            const IconComp = cat.meta.icon;
            const isTop = idx === 0;
            // Minimum bar width of 6px
            const barWidthPercent = Math.max(3, (cat.amount / maxAmount) * 100);

            return (
              <div key={cat.name} className="space-y-1.5">
                {/* Row: [icon] Full Category Name .......... bar .......... ₹ amount · % */}
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <CategoryIcon category={cat.name} size="sm" />
                    {/* Full category name, no cutting */}
                    <span className="font-bold text-slate-800 dark:text-white break-words text-[13px] leading-tight">
                      {cat.name}
                    </span>
                    {isTop && (
                      <span className="text-[10px] bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded-full uppercase shrink-0">
                        Top
                      </span>
                    )}
                  </div>

                  {/* Formatted amount with percentage next to it */}
                  <div className="text-right shrink-0 whitespace-nowrap">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white text-[13px]">
                      {formatIndianCurrency(cat.amount, false)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-400 font-medium text-[11px] ml-1.5">
                      · {Math.round(cat.percentage)}%
                    </span>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidthPercent}%`,
                      minWidth: "6px",
                      background: `linear-gradient(to right, ${cat.meta.gradientStart}, ${cat.meta.gradientEnd})`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Expandable "Others" Row if more than 6 categories */}
          {hasMoreThan6 && (
            <div className="pt-2">
              {!isExpanded ? (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                    <span>Others ({otherCategories.length} more categories)</span>
                    <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatIndianCurrency(othersTotalAmount, false)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-400 text-[11px] ml-1">
                      · {Math.round(othersPercentage)}%
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 dark:text-violet-400 hover:text-blue-800 dark:hover:text-violet-300 transition-colors cursor-pointer"
                >
                  <span>Show Top 5 Only</span>
                  <ChevronUp size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Desktop Layout (>= 640px): Vertical Bars WITHOUT Y-axis or gridlines */}
        <div className="hidden sm:block w-full h-[320px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 28, right: 16, left: 16, bottom: 20 }}
              barSize={Math.max(28, Math.min(52, Math.floor(520 / Math.max(1, data.length))))}
            >
              <defs>
                {data.map((item, idx) => (
                  <linearGradient
                    key={`bar-grad-${idx}`}
                    id={`bar-grad-${idx}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={item.meta.gradientStart} stopOpacity={1} />
                    <stop offset="100%" stopColor={item.meta.gradientEnd} stopOpacity={0.92} />
                  </linearGradient>
                ))}
              </defs>

              {/* No Gridlines and No Y-Axis as requested */}
              <XAxis
                dataKey="name"
                axisLine={{ stroke: themeTokens.gridLine }}
                tickLine={false}
                tick={{ fill: themeTokens.axisText, fontSize: 12, fontWeight: 700 }}
                interval={0}
              />

              <Tooltip
                cursor={{ fill: isDark ? "rgba(51, 65, 85, 0.4)" : "rgba(241, 245, 249, 0.6)" }}
                formatter={(val: any) => [formatIndianCurrency(Number(val), false), "Spending"]}
                contentStyle={{
                  backgroundColor: themeTokens.tooltipBg,
                  borderRadius: "12px",
                  border: isDark ? "1px solid #334155" : "none",
                  color: themeTokens.tooltipText,
                  fontSize: "12px",
                }}
              />

              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {data.map((_, idx) => (
                  <Cell key={`bar-cell-${idx}`} fill={`url(#bar-grad-${idx})`} />
                ))}
                <LabelList content={renderCustomBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
