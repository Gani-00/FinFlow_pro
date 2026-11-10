import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, where } from "firebase/firestore";
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  getReadableFirestoreErrorMessage,
} from "../lib/firebase";
import { useToast } from "../context/ToastContext";
import { parseFirestoreDate } from "../utils/dateUtils";
import {
  useReportCalculations,
  TransactionReportItem,
} from "../hooks/useReportCalculations";
import { exportToPDF, exportToCSV } from "../utils/reportExport";
import { ReportSummaryCards } from "../components/reports/ReportSummaryCards";
import { CategoryBarChart } from "../components/reports/CategoryBarChart";
import { SpendingDoughnutChart } from "../components/reports/SpendingDoughnutChart";
import { MonthlyOverviewChart } from "../components/reports/MonthlyOverviewChart";
import { FinancialInsights } from "../components/reports/FinancialInsights";
import {
  LayoutDashboard,
  FileDown,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  SlidersHorizontal,
  FileSearch,
  Plus,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react";

type DateFilterType = "weekly" | "monthly" | "yearly" | "custom";
type ChartTabType = "categories" | "distribution" | "monthly";

export default function Reports() {
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess } = useToast();
  const [allTransactions, setAllTransactions] = useState<TransactionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("monthly");
  
  // Graph Switcher tab state (defaults to 'categories' and persists across date filter changes)
  const [activeChart, setActiveChart] = useState<ChartTabType>("categories");

  // Custom date bounds (defaults to current month)
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEnd = now.toISOString().split("T")[0];
  const [customStart, setCustomStart] = useState<string>(defaultStart);
  const [customEnd, setCustomEnd] = useState<string>(defaultEnd);

  // Fetch real Firebase transactions
  const fetchTransactions = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const data: TransactionReportItem[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        const amount = Math.abs(Number(raw.amount) || 0);
        const type =
          String(raw.type || "expense").trim().toLowerCase() === "income"
            ? "income"
            : "expense";
        return {
          id: doc.id,
          name: raw.name || raw.description || "Untitled Transaction",
          amount,
          type,
          category: raw.category || "General",
          date: parseFirestoreDate(raw.date),
        };
      });
      data.sort((a, b) => b.date.getTime() - a.date.getTime());
      setAllTransactions(data);
    } catch (err: any) {
      const msg = getReadableFirestoreErrorMessage(err);
      setFetchError(msg);
      toastError(msg);
      handleFirestoreError(err, OperationType.LIST, "transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [toastError]);

  // Compute active start & end dates based on filter selection
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const current = new Date();
    let start = new Date();
    let end = new Date();
    let label = "";

    if (dateFilter === "weekly") {
      start = new Date(current);
      start.setDate(current.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      label = "Past 7 Days";
    } else if (dateFilter === "monthly") {
      start = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0);
      end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      label = current.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } else if (dateFilter === "yearly") {
      start = new Date(current.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999);
      label = `Year ${current.getFullYear()}`;
    } else {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      label = `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
    }

    return { startDate: start, endDate: end, periodLabel: label };
  }, [dateFilter, customStart, customEnd]);

  // Calculations engine
  const {
    filteredTransactions,
    totalIncome,
    totalExpense,
    remainingBalance,
    netSavings,
    savingsRate,
    changes,
    categoryList,
    doughnutCategoryList,
    monthlyData,
    bestSavingsMonth,
    insights,
  } = useReportCalculations({
    allTransactions,
    startDate,
    endDate,
    periodLabel,
    dateFilter,
  });

  // Export handlers (PDF always includes all 3 graphs and insights)
  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      toastError("No transactions to export for this period.");
      return;
    }
    exportToPDF({
      transactions: filteredTransactions,
      dateFilterLabel: periodLabel,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        net: remainingBalance,
        savings: netSavings,
        savingsRate,
      },
      categories: categoryList,
      monthlyData,
      insights,
    });
    toastSuccess("PDF Report generated successfully!");
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toastError("No transactions to export for this period.");
      return;
    }
    exportToCSV({
      transactions: filteredTransactions,
      dateFilterLabel: periodLabel,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        net: remainingBalance,
        savings: netSavings,
        savingsRate,
      },
      categories: categoryList,
      monthlyData,
      insights,
    });
    toastSuccess("CSV Ledger exported successfully!");
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-2 sm:px-4 overflow-x-hidden">
      {/* ============================================================== */}
      {/* A. Header (Stacked in 3 clean rows: No cramped desktop side bar) */}
      {/* ============================================================== */}
      <div className="space-y-3">
        {/* Row 1: Page Title and Subtitle, Full Width */}
        <div className="w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-violet-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 dark:shadow-violet-500/20 shrink-0">
              <LayoutDashboard size={18} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Reports & Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Understand your financial habits and track where your money goes.
          </p>
        </div>

        {/* Row 2: Scrollable Pill Row for Weekly / Monthly / Yearly / Custom (≥ 44px tall) */}
        <div className="w-full overflow-x-auto no-scrollbar pb-1">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 min-w-full sm:min-w-0">
            <button
              onClick={() => setDateFilter("weekly")}
              aria-label="Filter weekly"
              className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                dateFilter === "weekly"
                  ? "bg-white dark:bg-[#1E293B] text-blue-600 dark:text-violet-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays size={14} />
              <span>Weekly</span>
            </button>
            <button
              onClick={() => setDateFilter("monthly")}
              aria-label="Filter monthly"
              className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                dateFilter === "monthly"
                  ? "bg-white dark:bg-[#1E293B] text-blue-600 dark:text-violet-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarRange size={14} />
              <span>Monthly</span>
            </button>
            <button
              onClick={() => setDateFilter("yearly")}
              aria-label="Filter yearly"
              className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                dateFilter === "yearly"
                  ? "bg-white dark:bg-[#1E293B] text-blue-600 dark:text-violet-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <CalendarClock size={14} />
              <span>Yearly</span>
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              aria-label="Filter custom date range"
              className={`min-h-[44px] flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                dateFilter === "custom"
                  ? "bg-white dark:bg-[#1E293B] text-blue-600 dark:text-violet-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Custom</span>
            </button>
          </div>
        </div>

        {/* Row 3: Export PDF and Export CSV as Two Equal-Width Buttons */}
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleExportPDF}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors cursor-pointer"
            title="Export PDF Statement"
            aria-label="Export PDF Statement"
          >
            <FileDown size={15} className="text-rose-500 shrink-0" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors cursor-pointer"
            title="Export CSV Spreadsheet"
            aria-label="Export CSV Spreadsheet"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchTransactions}
            className="min-h-[44px] w-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
            title="Refresh"
            aria-label="Refresh transactions"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Custom Date Bounds Panel */}
      {dateFilter === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-300">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-300">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-blue-700 dark:text-violet-400 font-bold ml-auto">
            {periodLabel} ({filteredTransactions.length} items)
          </span>
        </div>
      )}

      {/* Error Retry Card */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{fetchError}</span>
          </div>
          <button
            onClick={fetchTransactions}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-lg font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="h-14 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-200/70 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : allTransactions.length === 0 ? (
        /* Empty State with FileSearch and Add Transaction Button */
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 sm:p-10 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-violet-950/50 text-blue-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-3">
            <FileSearch size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Transactions Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            There are no transactions recorded in your account yet. Log your first income or expense to generate live financial analytics.
          </p>
          <button
            onClick={() => navigate("/transactions")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-violet-600 hover:bg-blue-700 dark:hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Transaction</span>
          </button>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* B. Four Summary Cards (2 columns × 2 rows on mobile, 4 desktop) */}
          {/* ============================================================== */}
          <ReportSummaryCards
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            remainingBalance={remainingBalance}
            netSavings={netSavings}
            savingsRate={savingsRate}
            changes={changes}
          />

          {/* ============================================================== */}
          {/* C. Graph Switcher (Segmented control with 3 icon buttons)        */}
          {/* ============================================================== */}
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 shadow-inner">
            {/* Tab 1: Category-wise Spending */}
            <button
              onClick={() => setActiveChart("categories")}
              aria-label="View Category-wise Spending"
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeChart === "categories"
                  ? "bg-blue-600 dark:bg-violet-600 text-white shadow-md font-extrabold"
                  : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              }`}
            >
              <BarChart3 size={16} className="shrink-0" />
              <span className={activeChart === "categories" ? "inline" : "hidden sm:inline"}>
                Categories
              </span>
            </button>

            {/* Tab 2: Expense Distribution */}
            <button
              onClick={() => setActiveChart("distribution")}
              aria-label="View Expense Distribution"
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeChart === "distribution"
                  ? "bg-blue-600 dark:bg-violet-600 text-white shadow-md font-extrabold"
                  : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              }`}
            >
              <PieChartIcon size={16} className="shrink-0" />
              <span className={activeChart === "distribution" ? "inline" : "hidden sm:inline"}>
                Distribution
              </span>
            </button>

            {/* Tab 3: Monthly Financial Overview */}
            <button
              onClick={() => setActiveChart("monthly")}
              aria-label="View Monthly Financial Overview"
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeChart === "monthly"
                  ? "bg-blue-600 dark:bg-violet-600 text-white shadow-md font-extrabold"
                  : "bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60"
              }`}
            >
              <LineChartIcon size={16} className="shrink-0" />
              <span className={activeChart === "monthly" ? "inline" : "hidden sm:inline"}>
                Monthly
              </span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* D. Single Full-Width Active Graph with Fast <200ms Transition   */}
          {/* ============================================================== */}
          <div className="transition-opacity duration-150 w-full">
            {activeChart === "categories" && (
              <CategoryBarChart data={categoryList} />
            )}
            {activeChart === "distribution" && (
              <SpendingDoughnutChart
                data={doughnutCategoryList}
                totalExpense={totalExpense}
              />
            )}
            {activeChart === "monthly" && (
              <MonthlyOverviewChart
                data={monthlyData}
                bestSavingsMonth={bestSavingsMonth}
              />
            )}
          </div>

          {/* ============================================================== */}
          {/* E. Financial Insights (2 columns on mobile, larger text)       */}
          {/* ============================================================== */}
          <FinancialInsights insights={insights} />
        </>
      )}
    </div>
  );
}
