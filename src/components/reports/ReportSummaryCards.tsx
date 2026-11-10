import React from "react";
import { Wallet, Receipt, Landmark, PiggyBank } from "lucide-react";
import { formatIndianCurrency, MetricChange } from "../../hooks/useReportCalculations";

interface ReportSummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  netSavings: number;
  savingsRate: string | null;
  changes: {
    income: MetricChange | null;
    expense: MetricChange | null;
    balance: MetricChange | null;
    savings: MetricChange | null;
  };
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  totalIncome,
  totalExpense,
  remainingBalance,
  netSavings,
  savingsRate,
  changes,
}) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
      {/* 1. Total Income Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[170px] sm:min-h-[190px]">
        <div>
          {/* Icon top-left */}
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 shrink-0">
            <Wallet size={19} />
          </div>

          {/* Full Title (wrapped to 2 lines if needed, no ...) */}
          <p className="text-xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
            Total Income
          </p>

          {/* Amount on its own line (full Indian format, responsive clamp, never truncated) */}
          <div className="mt-1.5">
            <span
              className="font-extrabold tracking-tight text-slate-900 dark:text-white font-mono inline-block leading-tight"
              style={{ fontSize: "clamp(1.15rem, 4.2vw, 1.55rem)" }}
            >
              {formatIndianCurrency(totalIncome, totalIncome >= 100000)}
            </span>
          </div>
        </div>

        {/* Change Badge + Caption Stacked */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-start gap-0.5">
          {changes.income ? (
            <>
              <span
                className={`inline-block font-extrabold px-1.5 py-0.5 rounded text-[11px] leading-none ${
                  changes.income.isGood
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                }`}
              >
                {changes.income.badge}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {changes.income.caption}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Total inflows</span>
          )}
        </div>
      </div>

      {/* 2. Total Expenses Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[170px] sm:min-h-[190px]">
        <div>
          {/* Icon top-left */}
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 shrink-0">
            <Receipt size={19} />
          </div>

          {/* Full Title */}
          <p className="text-xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
            Total Expenses
          </p>

          {/* Amount on its own line */}
          <div className="mt-1.5">
            <span
              className="font-extrabold tracking-tight text-slate-900 dark:text-white font-mono inline-block leading-tight"
              style={{ fontSize: "clamp(1.15rem, 4.2vw, 1.55rem)" }}
            >
              {formatIndianCurrency(totalExpense, totalExpense >= 100000)}
            </span>
          </div>
        </div>

        {/* Change Badge + Caption Stacked */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-start gap-0.5">
          {changes.expense ? (
            <>
              <span
                className={`inline-block font-extrabold px-1.5 py-0.5 rounded text-[11px] leading-none ${
                  changes.expense.isGood
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                }`}
              >
                {changes.expense.badge}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {changes.expense.caption}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Total outflows</span>
          )}
        </div>
      </div>

      {/* 3. Remaining Balance Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[170px] sm:min-h-[190px]">
        <div>
          {/* Icon top-left */}
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 shrink-0">
            <Landmark size={19} />
          </div>

          {/* Full Title */}
          <p className="text-xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
            Remaining Balance
          </p>

          {/* Amount on its own line */}
          <div className="mt-1.5">
            <span
              className={`font-extrabold tracking-tight font-mono inline-block leading-tight ${
                remainingBalance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-600 dark:text-rose-400"
              }`}
              style={{ fontSize: "clamp(1.15rem, 4.2vw, 1.55rem)" }}
            >
              {formatIndianCurrency(remainingBalance, Math.abs(remainingBalance) >= 100000)}
            </span>
          </div>
        </div>

        {/* Change Badge + Caption Stacked */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-start gap-0.5">
          {changes.balance ? (
            <>
              <span
                className={`inline-block font-extrabold px-1.5 py-0.5 rounded text-[11px] leading-none ${
                  changes.balance.isGood
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                }`}
              >
                {changes.balance.badge}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {changes.balance.caption}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Income − Expenses</span>
          )}
        </div>
      </div>

      {/* 4. Net Savings Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between h-full min-h-[170px] sm:min-h-[190px]">
        <div>
          {/* Icon top-left */}
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 shrink-0">
            <PiggyBank size={19} />
          </div>

          {/* Full Title */}
          <p className="text-xs sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
            Net Savings
          </p>

          {/* Amount on its own line */}
          <div className="mt-1.5">
            <span
              className={`font-extrabold tracking-tight font-mono inline-block leading-tight ${
                netSavings >= 0 ? "text-purple-700 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"
              }`}
              style={{ fontSize: "clamp(1.15rem, 4.2vw, 1.55rem)" }}
            >
              {formatIndianCurrency(netSavings, Math.abs(netSavings) >= 100000)}
            </span>
          </div>
        </div>

        {/* Savings Rate & Change Badge */}
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Rate: {savingsRate ? `${savingsRate}%` : "—"}
            </span>
            {changes.savings && (
              <span
                className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] leading-none ${
                  changes.savings.isGood
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400"
                }`}
              >
                {changes.savings.badge}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {changes.savings ? changes.savings.caption : "of total inflow"}
          </span>
        </div>
      </div>
    </div>
  );
};
