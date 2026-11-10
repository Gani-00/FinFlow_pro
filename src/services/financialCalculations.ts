import { startOfMonth } from "date-fns";
import { parseFirestoreDate } from "../utils/dateUtils";

export interface TransactionRecord {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  rawDate?: any;
}

export interface FinancialAggregates {
  // All-time metrics
  allTimeIncome: number;
  allTimeExpenses: number;
  allTimeBalance: number;
  allTimeSavingsRate: number;

  // Monthly metrics (current month)
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number;
  monthlySavingsRate: number;
  monthlySpentPct: number;
  currentMonthName: string; // e.g. "November 2026"
}

/**
 * Normalizes raw Firestore document data into a clean, validated TransactionRecord.
 */
export function normalizeTransactionDoc(id: string, data: any): TransactionRecord {
  const rawAmount = typeof data.amount === "number" ? data.amount : parseFloat(String(data.amount || 0));
  const amount = isNaN(rawAmount) ? 0 : Math.abs(rawAmount);
  const normalizedType =
    String(data.type || "expense").trim().toLowerCase() === "income" ? "income" : "expense";
  const category = (data.category || "Other").trim();
  const name = (data.name || data.description || "Untitled Transaction").trim();
  const date = parseFirestoreDate(data.date);

  return {
    id,
    name,
    amount,
    type: normalizedType,
    category,
    date,
    rawDate: data.date,
  };
}

/**
 * Single, unified calculation engine for FinFlow Pro financial stats.
 * Used by Dashboard, Activity, and Reports to eliminate discrepancies.
 */
export function calculateFinancialStats(transactions: TransactionRecord[]): FinancialAggregates {
  const now = new Date();
  const startOfCurrentMonth = startOfMonth(now);
  const currentMonthName = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  let allTimeIncome = 0;
  let allTimeExpenses = 0;
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      allTimeIncome += tx.amount;
      if (tx.date >= startOfCurrentMonth) {
        monthlyIncome += tx.amount;
      }
    } else {
      allTimeExpenses += tx.amount;
      if (tx.date >= startOfCurrentMonth) {
        monthlyExpenses += tx.amount;
      }
    }
  }

  const allTimeBalance = allTimeIncome - allTimeExpenses;
  const monthlyBalance = monthlyIncome - monthlyExpenses;

  const allTimeSavingsRate =
    allTimeIncome > 0 ? Math.round(((allTimeIncome - allTimeExpenses) / allTimeIncome) * 100) : 0;
  const monthlySavingsRate =
    monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

  const monthlySpentPct =
    monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : monthlyExpenses > 0 ? 100 : 0;

  return {
    allTimeIncome,
    allTimeExpenses,
    allTimeBalance,
    allTimeSavingsRate,
    monthlyIncome,
    monthlyExpenses,
    monthlyBalance,
    monthlySavingsRate,
    monthlySpentPct: Math.min(monthlySpentPct, 100),
    currentMonthName,
  };
}

/**
 * Computes chronological running balance for an array of transactions.
 */
export function calculateChronologicalBalances(
  transactions: TransactionRecord[]
): Record<string, number> {
  const ascending = [...transactions].sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  let running = 0;
  const map: Record<string, number> = {};
  for (const t of ascending) {
    if (t.type === "income") {
      running += t.amount;
    } else {
      running -= t.amount;
    }
    map[t.id] = running;
  }
  return map;
}
