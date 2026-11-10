import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { LineChart as LineChartIcon, CircleArrowUp, CircleArrowDown, Coins, Sparkles } from "lucide-react";
import { MonthlyOverviewItem, formatIndianCurrency } from "../../hooks/useReportCalculations";
import { useTheme } from "../../context/ThemeContext";
import { getChartThemeTokens } from "../../utils/themeChartUtils";

interface MonthlyOverviewChartProps {
  data: MonthlyOverviewItem[];
  bestSavingsMonth: { name: string; amount: number } | null;
}

export const MonthlyOverviewChart: React.FC<MonthlyOverviewChartProps> = ({
  data,
  bestSavingsMonth,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeTokens = getChartThemeTokens(resolvedTheme);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[260px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
          <LineChartIcon size={24} />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No monthly financial history available</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          Transactions recorded across months will populate this overview automatically.
        </p>
      </div>
    );
  }

  // Node callout label on savings trend line (integer Indian format)
  const renderSavingsNodeLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === undefined || value === null) return null;

    const formatted = formatIndianCurrency(value, false);

    return (
      <g>
        <text
          x={x}
          y={Math.max(14, y - 8)}
          fill={isDark ? "#34D399" : "#047857"}
          textAnchor="middle"
          fontSize={10}
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
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <LineChartIcon size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Monthly Financial Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Income, expenses and net savings trend across months
            </p>
          </div>
        </div>

        {/* Legend ABOVE the chart */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <CircleArrowUp size={15} />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
              <CircleArrowDown size={15} />
              <span>Expenses</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Coins size={15} />
              <span>Savings</span>
            </div>
          </div>

          {bestSavingsMonth && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                Best savings month:{" "}
                <strong className="font-extrabold text-emerald-950 dark:text-emerald-200">
                  {bestSavingsMonth.name} ({formatIndianCurrency(bestSavingsMonth.amount, false)})
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Horizontally scrollable chart box WITHOUT Y-axis numbers */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[480px] sm:min-w-[540px] h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 24, right: 20, left: 20, bottom: 8 }}
                barGap={6}
              >
                {/* No Y-Axis or gridlines as requested */}
                <XAxis
                  dataKey="month"
                  axisLine={{ stroke: themeTokens.gridLine }}
                  tickLine={false}
                  tick={{ fill: themeTokens.axisText, fontSize: 12, fontWeight: 700 }}
                />

                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatIndianCurrency(Number(val), false),
                    name === "income" ? "Income" : name === "expense" ? "Expense" : "Net Savings",
                  ]}
                  labelFormatter={(lbl) => `Month: ${lbl}`}
                  contentStyle={{
                    backgroundColor: themeTokens.tooltipBg,
                    borderRadius: "12px",
                    border: isDark ? "1px solid #334155" : "none",
                    color: themeTokens.tooltipText,
                    fontSize: "12px",
                  }}
                />

                {/* Blue Bars = Income */}
                <Bar
                  dataKey="income"
                  name="income"
                  fill="#3B82F6"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />

                {/* Pink/Purple Bars = Expenses */}
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="#EC4899"
                  radius={[6, 6, 0, 0]}
                  barSize={24}
                />

                {/* Green Line = Savings */}
                <Line
                  type="monotone"
                  dataKey="net"
                  name="net"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10B981", stroke: isDark ? "#1E293B" : "#FFFFFF", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  label={renderSavingsNodeLabel}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Values Listed in a Small Table Below the Chart */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2.5">
            Full Monthly Figures
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {data.map((item) => (
              <div
                key={item.month}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60 mb-1.5">
                  <span className="text-[13px]">{item.month}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      item.net >= 0 ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                    }`}
                  >
                    {item.net >= 0 ? "Surplus" : "Deficit"}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span className="font-semibold">Income:</span>
                    <span className="font-bold">{formatIndianCurrency(item.income, false)}</span>
                  </div>
                  <div className="flex justify-between text-pink-600 dark:text-pink-400">
                    <span className="font-semibold">Expense:</span>
                    <span className="font-bold">{formatIndianCurrency(item.expense, false)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-700/60 pt-1">
                    <span>Net:</span>
                    <span>{formatIndianCurrency(item.net, false)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
