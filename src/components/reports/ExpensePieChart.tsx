import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatIndianCurrency } from "../../utils/reportExport";

interface ExpensePieItem {
  name: string;
  value: number;
  percentage: number;
}

interface ExpensePieChartProps {
  data: ExpensePieItem[];
  totalExpense: number;
}

const PIE_COLORS = [
  "#831843", // Deep burgundy (similar to Reference Image 2 dominant slice)
  "#4338CA", // Deep indigo/slate
  "#EF4444", // Coral/red
  "#F87171", // Soft rose coral
  "#9D174D", // Magenta wine
  "#60A5FA", // Soft steel blue
  "#0284C7", // Cerulean
  "#D97706", // Amber
];

export const ExpensePieChart: React.FC<ExpensePieChartProps> = ({ data, totalExpense }) => {
  if (!data || data.length === 0 || totalExpense === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-center min-h-[380px] text-center">
        <p className="text-sm font-semibold text-slate-500">No expense distribution available</p>
        <p className="text-xs text-slate-400 mt-1">Add transactions to generate distribution chart</p>
      </div>
    );
  }

  // Custom Leader Line and Label Renderer (Inspired by Reference Image 2)
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (percent < 0.04) return null; // Don't crowd tiny slices

    const RADIAN = Math.PI / 180;
    // Radius for line start, elbow, and label end
    const r1 = outerRadius + 2;
    const r2 = outerRadius + 18;
    const r3 = outerRadius + 26;

    const sx = cx + r1 * Math.cos(-midAngle * RADIAN);
    const sy = cy + r1 * Math.sin(-midAngle * RADIAN);
    const mx = cx + r2 * Math.cos(-midAngle * RADIAN);
    const my = cy + r2 * Math.sin(-midAngle * RADIAN);
    const ex = mx + (Math.cos(-midAngle * RADIAN) >= 0 ? 1 : -1) * 16;
    const ey = my;
    const textAnchor = Math.cos(-midAngle * RADIAN) >= 0 ? "start" : "end";

    return (
      <g>
        {/* Subtle connector polyline */}
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke="#94A3B8"
          strokeWidth={1}
          fill="none"
        />
        <circle cx={sx} cy={sy} r={2} fill="#64748B" />
        {/* Percentage text */}
        <text
          x={ex + (Math.cos(-midAngle * RADIAN) >= 0 ? 4 : -4)}
          y={ey + 4}
          textAnchor={textAnchor}
          fill="#1E293B"
          fontSize={11}
          fontWeight={700}
          fontFamily="monospace"
        >
          {`${(percent * 100).toFixed(1)}%`}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Expense Distribution</h3>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            Total: {formatIndianCurrency(totalExpense)}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Visible percentage callouts with sector proportions (no hover needed)
        </p>

        {/* Top Legend Bar Inspired by Reference Image 2 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-2 pb-3 border-b border-slate-100">
          {data.slice(0, 6).map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
              />
              <span className="font-medium text-slate-700">{item.name}</span>
            </div>
          ))}
        </div>

        {/* 3D-inspired Pie Container with Leader Lines */}
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.15" />
                </filter>
              </defs>
              <Tooltip
                formatter={(value: any) => [formatIndianCurrency(Number(value)), "Amount"]}
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderRadius: "12px",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "12px",
                }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={renderCustomizedLabel}
                labelLine={false}
                filter="url(#pieShadow)"
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`pie-cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown table below */}
      <div className="mt-2 pt-3 border-t border-slate-100 divide-y divide-slate-100">
        {data.map((item, idx) => (
          <div key={item.name} className="flex items-center justify-between py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
              />
              <span className="font-medium text-slate-800">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono font-medium">
                {item.percentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-slate-900 font-mono w-24 text-right">
                {formatIndianCurrency(item.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
