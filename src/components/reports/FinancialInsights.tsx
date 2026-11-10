import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  GitCompareArrows,
  Activity,
  CalendarCheck,
  ChartSpline,
} from "lucide-react";
import { FinancialInsightItem } from "../../hooks/useReportCalculations";

interface FinancialInsightsProps {
  insights: FinancialInsightItem[];
}

export const FinancialInsights: React.FC<FinancialInsightsProps> = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return null;
  }

  const getInsightIcon = (id: string) => {
    switch (id) {
      case "highest-spending":
        return TrendingUp;
      case "lowest-spending":
        return TrendingDown;
      case "spending-trend":
        return ChartSpline;
      case "savings-rate":
        return Percent;
      case "monthly-comparison":
        return GitCompareArrows;
      case "financial-activity":
        return Activity;
      case "avg-daily-spend":
        return CalendarCheck;
      default:
        return Activity;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 sm:p-7 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Financial Insights
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Automated observations calculated from your actual transaction records
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {insights.map((ins) => {
          const IconComp = getInsightIcon(ins.id);
          return (
            <div
              key={ins.id}
              className="p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: `${ins.accentColor}18`, color: ins.accentColor }}
                  >
                    <IconComp size={18} />
                  </div>
                  {ins.badgeText && (
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: `${ins.accentColor}15`, color: ins.accentColor }}
                    >
                      {ins.badgeText}
                    </span>
                  )}
                </div>

                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {ins.title}
                </p>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {ins.value}
                </h4>
              </div>

              <p className="mt-3 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 leading-relaxed">
                {ins.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
