import React from "react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { CategorySummaryItem, formatIndianCurrency } from "../../hooks/useReportCalculations";
import { useTheme } from "../../context/ThemeContext";
import { getChartThemeTokens } from "../../utils/themeChartUtils";
import { CategoryIcon } from "../transactions/categoryMeta";

interface SpendingDoughnutChartProps {
  data: CategorySummaryItem[];
  totalExpense: number;
}

export const SpendingDoughnutChart: React.FC<SpendingDoughnutChartProps> = ({
  data,
  totalExpense,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const themeTokens = getChartThemeTokens(resolvedTheme);

  if (!data || data.length === 0 || totalExpense === 0) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[260px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
          <PieChartIcon size={24} />
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No expense distribution available</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
          Expenses logged in this period will automatically populate this doughnut breakdown.
        </p>
      </div>
    );
  }

  // Inside slice percentage label where space permits
  const renderSlicePercentLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={800}
        fontFamily="sans-serif"
        style={{
          textShadow: "0px 1px 3px rgba(0, 0, 0, 0.5)",
          pointerEvents: "none",
        }}
      >
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Expense Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Percentages by category with center total expenses
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
            {data.length} Categories
          </span>
        </div>

        {/* Centered Doughnut Ring at Safe Width (No Overflow) */}
        <div className="relative w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] mx-auto my-2">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Tooltip
                formatter={(val: any) => [formatIndianCurrency(Number(val), false), "Expense"]}
                contentStyle={{
                  backgroundColor: themeTokens.tooltipBg,
                  borderRadius: "12px",
                  border: isDark ? "1px solid #334155" : "none",
                  color: themeTokens.tooltipText,
                  fontSize: "12px",
                }}
              />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={100}
                label={renderSlicePercentLabel}
                labelLine={false}
                stroke={themeTokens.sliceBorder}
                strokeWidth={2.5}
              >
                {data.map((item, index) => (
                  <Cell key={`donut-cell-${index}`} fill={item.meta.color} />
                ))}
              </Pie>
            </RechartsPie>
          </ResponsiveContainer>

          {/* Centered Total Expenses */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
              Total Expenses
            </span>
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatIndianCurrency(totalExpense, false)}
            </span>
          </div>
        </div>

        {/* Full-width Legend Rows BELOW the Doughnut with NOTHING Truncated */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 px-3 pb-1 border-b border-slate-100 dark:border-slate-800">
            <span>Category</span>
            <span>Amount · Share</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((item) => {
              const IconComp = item.meta.icon;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2 px-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl transition-colors text-xs gap-3"
                >
                  {/* Full Category Name with CategoryIcon */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CategoryIcon category={item.name} size="sm" />
                    <span className="font-bold text-slate-800 dark:text-white text-[13px] break-words">
                      {item.name}
                    </span>
                  </div>

                  {/* Clean Amount and Percentage */}
                  <div className="text-right shrink-0 whitespace-nowrap">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white text-[13px]">
                      {formatIndianCurrency(item.amount, false)}
                    </span>
                    <span className="text-slate-400 dark:text-slate-400 font-semibold text-[11px] ml-2">
                      · {Math.round(item.percentage)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
