import { useMemo } from "react";
import { getCategoryMeta, CategoryMeta } from "../components/reports/categoryMeta";

export interface TransactionReportItem {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
}

export interface MetricChange {
  percentage: number;
  badge: string; // e.g. "▲ 337%" or "▼ 12%"
  caption: string; // e.g. "vs last period"
  isGood: boolean; // green = good, red = bad
}

export interface CategorySummaryItem {
  name: string;
  amount: number;
  percentage: number;
  meta: CategoryMeta;
  isOtherGroup?: boolean;
}

export interface MonthlyOverviewItem {
  month: string; // "Jan", "Feb"
  monthFull: string; // "January 2026"
  income: number;
  expense: number;
  net: number; // income - expense
}

export interface FinancialInsightItem {
  id: string;
  title: string;
  value: string;
  description: string;
  accentColor: string;
  badgeText?: string;
}

/**
 * Clean Indian Currency formatting:
 * - Always whole numbers (no .00 decimals): ₹50,000, ₹2,400, ₹649, ₹450
 * - Uses L / Cr only above ₹1,00,000 when compact = true
 */
export function formatIndianCurrency(amount: number, compact = false): string {
  const isNegative = amount < 0;
  const absAmount = Math.round(Math.abs(amount));

  if (compact) {
    if (absAmount >= 10000000) {
      return `${isNegative ? "-" : ""}₹${(absAmount / 10000000).toFixed(1)}Cr`;
    }
    if (absAmount >= 100000) {
      return `${isNegative ? "-" : ""}₹${(absAmount / 100000).toFixed(1)}L`;
    }
  }

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

interface UseReportCalculationsProps {
  allTransactions: TransactionReportItem[];
  startDate: Date;
  endDate: Date;
  periodLabel: string;
  dateFilter: "weekly" | "monthly" | "yearly" | "custom";
}

export function useReportCalculations({
  allTransactions,
  startDate,
  endDate,
  periodLabel,
  dateFilter,
}: UseReportCalculationsProps) {
  // 1. Filter transactions for the selected active window
  const filteredTransactions = useMemo(() => {
    const s = startDate.getTime();
    const e = endDate.getTime();
    return allTransactions.filter((t) => {
      const time = t.date.getTime();
      return time >= s && time <= e;
    });
  }, [allTransactions, startDate, endDate]);

  // 2. Identify previous equivalent window for comparisons
  const { previousTransactions, currentPeriodDurationDays } = useMemo(() => {
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - durationMs);
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevS = prevStart.getTime();
    const prevE = prevEnd.getTime();

    const prevTxs = allTransactions.filter((t) => {
      const time = t.date.getTime();
      return time >= prevS && time <= prevE;
    });

    const days = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));
    return {
      previousTransactions: prevTxs,
      currentPeriodDurationDays: days,
    };
  }, [allTransactions, startDate, endDate]);

  // 3. Totals & Card Calculations
  const {
    totalIncome,
    totalExpense,
    remainingBalance,
    netSavings,
    savingsRate,
    changes,
  } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === "income") inc += t.amount;
      if (t.type === "expense") exp += t.amount;
    });

    const remBal = inc - exp;
    const sav = inc - exp;
    const savRate = inc > 0 ? ((sav / inc) * 100).toFixed(0) : null;

    // Previous totals
    let prevInc = 0;
    let prevExp = 0;
    previousTransactions.forEach((t) => {
      if (t.type === "income") prevInc += t.amount;
      if (t.type === "expense") prevExp += t.amount;
    });
    const prevBal = prevInc - prevExp;
    const prevSav = prevInc - prevExp;

    const calcChange = (
      current: number,
      previous: number,
      lowerIsBetter: boolean
    ): MetricChange | null => {
      if (!previous || previous === 0) return null;
      const diff = current - previous;
      const pct = (diff / Math.abs(previous)) * 100;
      if (Math.abs(pct) < 0.1) return null;

      const isUp = pct > 0;
      const formattedPct = Math.abs(Math.round(pct));
      const isGood = lowerIsBetter ? !isUp : isUp;

      return {
        percentage: pct,
        badge: `${isUp ? "▲" : "▼"} ${formattedPct}%`,
        caption: "vs last period",
        isGood,
      };
    };

    return {
      totalIncome: inc,
      totalExpense: exp,
      remainingBalance: remBal,
      netSavings: sav,
      savingsRate: savRate,
      changes: {
        income: calcChange(inc, prevInc, false),
        expense: calcChange(exp, prevExp, true), // Lower expense is good (green)
        balance: calcChange(remBal, prevBal, false),
        savings: calcChange(sav, prevSav, false),
      },
    };
  }, [filteredTransactions, previousTransactions]);

  // 4. Category-wise Spending (Sorted High to Low)
  const { categoryList, doughnutCategoryList } = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "General";
        map[cat] = (map[cat] || 0) + t.amount;
      });

    const total = Object.values(map).reduce((a, b) => a + b, 0);

    const sortedRaw = Object.entries(map)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        meta: getCategoryMeta(name, idx),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Group slices under 3% into "Others" for doughnut
    const doughnutList: CategorySummaryItem[] = [];
    let othersAmount = 0;

    sortedRaw.forEach((item) => {
      if (item.percentage < 3 && sortedRaw.length > 4) {
        othersAmount += item.amount;
      } else {
        doughnutList.push(item);
      }
    });

    if (othersAmount > 0) {
      doughnutList.push({
        name: "Others",
        amount: othersAmount,
        percentage: total > 0 ? (othersAmount / total) * 100 : 0,
        meta: getCategoryMeta("Others", 8),
        isOtherGroup: true,
      });
    }

    return {
      categoryList: sortedRaw,
      doughnutCategoryList: doughnutList,
    };
  }, [filteredTransactions]);

  // 5. Monthly Financial Overview
  const { monthlyData, bestSavingsMonth } = useMemo(() => {
    const monthsMap: Record<
      string,
      { income: number; expense: number; full: string; date: Date }
    > = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-IN", { month: "short" });
      const full = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      monthsMap[key] = { income: 0, expense: 0, full, date: d };
    }

    allTransactions.forEach((t) => {
      const key = t.date.toLocaleDateString("en-IN", { month: "short" });
      if (monthsMap[key]) {
        if (t.type === "income") monthsMap[key].income += t.amount;
        if (t.type === "expense") monthsMap[key].expense += t.amount;
      }
    });

    const list = Object.entries(monthsMap)
      .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
      .map(([month, d]) => ({
        month,
        monthFull: d.full,
        income: d.income,
        expense: d.expense,
        net: d.income - d.expense,
      }));

    let bestMonth: { name: string; amount: number } | null = null;
    list.forEach((m) => {
      if (m.net > 0 && (!bestMonth || m.net > bestMonth.amount)) {
        bestMonth = { name: m.monthFull.split(" ")[0], amount: m.net };
      }
    });

    return {
      monthlyData: list,
      bestSavingsMonth: bestMonth,
    };
  }, [allTransactions]);

  // 6. Actionable Financial Insights
  const insights = useMemo<FinancialInsightItem[]>(() => {
    const list: FinancialInsightItem[] = [];

    // 1. Highest Spending Category
    if (categoryList.length > 0 && categoryList[0].amount > 0) {
      const top = categoryList[0];
      list.push({
        id: "highest-spending",
        title: "Highest Spending Category",
        value: `${top.name} (${formatIndianCurrency(top.amount)})`,
        description: `Accounts for ${top.percentage.toFixed(0)}% of your total expenses in this period.`,
        accentColor: "#F43F5E",
        badgeText: "Top Expense",
      });
    }

    // 2. Lowest Spending Category
    if (categoryList.length > 1) {
      const lowest = categoryList[categoryList.length - 1];
      if (lowest.amount > 0 && lowest.name !== categoryList[0].name) {
        list.push({
          id: "lowest-spending",
          title: "Lowest Spending Category",
          value: `${lowest.name} (${formatIndianCurrency(lowest.amount)})`,
          description: `Represents ${lowest.percentage.toFixed(0)}% of spending. Great budget discipline here!`,
          accentColor: "#10B981",
          badgeText: "Controlled",
        });
      }
    }

    // 3. Spending Trend
    if (changes.expense) {
      const isReduced = changes.expense.percentage < 0;
      list.push({
        id: "spending-trend",
        title: "Spending Trend",
        value: `${Math.abs(Math.round(changes.expense.percentage))}% ${isReduced ? "Decrease" : "Increase"}`,
        description: isReduced
          ? "You spent less compared to the previous period. Excellent progress!"
          : "Your spending accelerated compared to the previous period.",
        accentColor: isReduced ? "#10B981" : "#F59E0B",
        badgeText: isReduced ? "Positive Trend" : "Watch Out",
      });
    }

    // 4. Savings Rate
    if (totalIncome > 0 && savingsRate !== null) {
      const rateNum = parseFloat(savingsRate);
      const isGood = rateNum >= 20;
      list.push({
        id: "savings-rate",
        title: "Savings Rate",
        value: `${savingsRate}% of Income`,
        description: isGood
          ? "Surpasses the recommended 20% financial wellness benchmark."
          : "Consider reducing non-essential categories to reach the 20% target.",
        accentColor: isGood ? "#8B5CF6" : "#F59E0B",
        badgeText: isGood ? "Healthy" : "Below Target",
      });
    }

    // 5. Monthly Comparison / Budget Health
    if (totalIncome > 0 && totalExpense > 0) {
      const expRatio = Math.round((totalExpense / totalIncome) * 100);
      list.push({
        id: "monthly-comparison",
        title: "Income vs. Expense Ratio",
        value: `${expRatio}% Expensed`,
        description: `You are utilizing ${expRatio}% of your inflow. Remaining ${100 - expRatio}% saved.`,
        accentColor: "#3B82F6",
        badgeText: "Budget Flow",
      });
    }

    // 6. Financial Activity
    if (filteredTransactions.length > 0) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayCounts: Record<string, number> = {};
      filteredTransactions.forEach((t) => {
        const day = days[t.date.getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      let topDay = "Multiple days";
      let maxCount = 0;
      Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topDay = day;
        }
      });

      list.push({
        id: "financial-activity",
        title: "Financial Activity",
        value: `${filteredTransactions.length} Transactions`,
        description: `Most transaction activity occurred on ${topDay}s (${maxCount} records).`,
        accentColor: "#6366F1",
        badgeText: "Activity Peak",
      });
    }

    // 7. Average Daily Spend
    if (totalExpense > 0 && currentPeriodDurationDays > 0) {
      const dailyAvg = totalExpense / currentPeriodDurationDays;
      list.push({
        id: "avg-daily-spend",
        title: "Average Daily Spend",
        value: formatIndianCurrency(dailyAvg),
        description: `Based on ₹${Math.round(totalExpense)} total expense across ${currentPeriodDurationDays} days in this filter.`,
        accentColor: "#06B6D4",
        badgeText: "Daily Burn",
      });
    }

    return list;
  }, [
    categoryList,
    changes,
    totalIncome,
    totalExpense,
    savingsRate,
    filteredTransactions,
    currentPeriodDurationDays,
  ]);

  return {
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
  };
}
