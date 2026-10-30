import { motion } from "motion/react";
import { Plus, PieChart, Target, FileText, Settings, ChevronRight, TrendingUp, TrendingDown, Sparkles, Bell, ArrowUpRight, ArrowDownRight, Database, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFinancialInsights } from "../services/geminiService";
import { db, auth, handleFirestoreError, OperationType, getReadableFirestoreErrorMessage } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit,
  writeBatch,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { useCurrency, formatCurrency } from "../services/currencyService";
import { parseFirestoreDate } from "../utils/dateUtils";
import { setDate, isBefore, startOfToday, addMonths, startOfMonth, format } from "date-fns";
import { useToast } from "../context/ToastContext";

interface TransactionItem {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: Date;
  rawDate: any;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currency } = useCurrency();
  const { success: toastSuccess, error: toastError } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [timeframe, setTimeframe] = useState<"month" | "all">("month");

  const [stats, setStats] = useState({
    totalBalance: 0,
    allTimeIncome: 0,
    allTimeExpenses: 0,
    monthlyBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyProgress: 0,
    allTimeProgress: 0,
  });

  const [bills, setBills] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const totalMonthlyUpcoming = bills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  // Monitor auth state changes reliably
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Fetch Firestore data
  useEffect(() => {
    if (!currentUser) {
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);

    // Query transactions by userId only (sort in-memory to prevent missing composite index errors)
    const txQuery = query(
      collection(db, "transactions"),
      where("userId", "==", currentUser.uid)
    );

    const billsQuery = query(
      collection(db, "recurring"),
      where("userId", "==", currentUser.uid)
    );

    const budgetsQuery = query(
      collection(db, "budgets"),
      where("userId", "==", currentUser.uid),
      limit(2)
    );

    const goalsQuery = query(
      collection(db, "goals"),
      where("userId", "==", currentUser.uid),
      limit(2)
    );

    const unsubscribeTx = onSnapshot(
      txQuery,
      (snapshot) => {
        const txs: TransactionItem[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const parsedDate = parseFirestoreDate(data.date);
          const rawAmount = typeof data.amount === "number" ? data.amount : parseFloat(String(data.amount || 0));
          const normalizedType = String(data.type || "expense").trim().toLowerCase() === "income" ? "income" : "expense";

          return {
            id: docSnap.id,
            name: data.name || "Untitled Transaction",
            amount: isNaN(rawAmount) ? 0 : Math.abs(rawAmount),
            type: normalizedType,
            category: data.category || "General",
            date: parsedDate,
            rawDate: data.date,
          };
        });

        // Sort descending by transaction date
        txs.sort((a, b) => b.date.getTime() - a.date.getTime());

        let allTimeInc = 0;
        let allTimeExp = 0;
        let monthlyInc = 0;
        let monthlyExp = 0;
        const startOfThisMonth = startOfMonth(new Date());

        txs.forEach((tx) => {
          if (tx.type === "income") {
            allTimeInc += tx.amount;
          } else {
            allTimeExp += tx.amount;
          }

          if (tx.date >= startOfThisMonth) {
            if (tx.type === "income") {
              monthlyInc += tx.amount;
            } else {
              monthlyExp += tx.amount;
            }
          }
        });

        const monthlySpentPct = monthlyInc > 0 ? (monthlyExp / monthlyInc) * 100 : monthlyExp > 0 ? 100 : 0;
        const allTimeSpentPct = allTimeInc > 0 ? (allTimeExp / allTimeInc) * 100 : allTimeExp > 0 ? 100 : 0;

        setStats({
          totalBalance: allTimeInc - allTimeExp,
          allTimeIncome: allTimeInc,
          allTimeExpenses: allTimeExp,
          monthlyBalance: monthlyInc - monthlyExp,
          monthlyIncome: monthlyInc,
          monthlyExpenses: monthlyExp,
          monthlyProgress: Math.min(monthlySpentPct, 100),
          allTimeProgress: Math.min(allTimeSpentPct, 100),
        });

        // If this month has 0 income & spent, but all-time has data, smartly default to all-time
        if (monthlyInc === 0 && monthlyExp === 0 && (allTimeInc > 0 || allTimeExp > 0)) {
          setTimeframe("all");
        }

        setTransactions(txs);
        setLoadingTransactions(false);

        if (txs.length > 0 && insights.length === 0) {
          triggerInsights(txs);
        }
      },
      (error) => {
        setLoadingTransactions(false);
        console.error("Transactions snapshot error:", error);
        toastError(getReadableFirestoreErrorMessage(error));
        handleFirestoreError(error, OperationType.LIST, "transactions");
      }
    );

    const unsubscribeBills = onSnapshot(
      billsQuery,
      (snapshot) => {
        const bList = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const day = Number(data.dayOfMonth) || 1;
          let nextDate = setDate(new Date(), day);
          if (isBefore(nextDate, startOfToday())) {
            nextDate = addMonths(nextDate, 1);
          }
          return { id: docSnap.id, ...data, nextDate };
        });
        const sorted = bList.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
        setBills(sorted);
      },
      (error) => {
        console.error("Bills snapshot error:", error);
        toastError(getReadableFirestoreErrorMessage(error));
        handleFirestoreError(error, OperationType.LIST, "recurring");
      }
    );

    const unsubscribeBudgets = onSnapshot(
      budgetsQuery,
      (snapshot) => {
        setBudgets(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.error("Budgets snapshot error:", error);
        toastError(getReadableFirestoreErrorMessage(error));
        handleFirestoreError(error, OperationType.LIST, "budgets");
      }
    );

    const unsubscribeGoals = onSnapshot(
      goalsQuery,
      (snapshot) => {
        setGoals(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (error) => {
        console.warn("Goals snapshot notice:", error);
      }
    );

    return () => {
      unsubscribeTx();
      unsubscribeBills();
      unsubscribeBudgets();
      unsubscribeGoals();
    };
  }, [currentUser, toastError]);

  const triggerInsights = async (txs: any[]) => {
    if (loadingInsights) return;
    setLoadingInsights(true);
    try {
      const newInsights = await getFinancialInsights(txs);
      setInsights(newInsights);
    } catch (err) {
      console.warn("Notice loading financial insights:", err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const demoItems = [
        { name: "Monthly Salary / Income", amount: 45000, type: "income", category: "Salary" },
        { name: "Grocery & Provisions", amount: 3800, type: "expense", category: "Food" },
        { name: "Internet & Utility Bills", amount: 1250, type: "expense", category: "Bills" },
        { name: "Weekend Dining & Cafe", amount: 950, type: "expense", category: "Dining" },
      ];

      demoItems.forEach((item) => {
        const newDocRef = doc(collection(db, "transactions"));
        batch.set(newDocRef, {
          userId: currentUser.uid,
          name: item.name,
          amount: item.amount,
          type: item.type,
          category: item.category,
          date: serverTimestamp(),
        });
      });

      await batch.commit();
      toastSuccess("Sample transactions added! Dashboard metrics updated.");
    } catch (err) {
      console.error("Error seeding demo data:", err);
      toastError(getReadableFirestoreErrorMessage(err));
      handleFirestoreError(err, OperationType.CREATE, "transactions");
    } finally {
      setSeeding(false);
    }
  };

  // Determine active metrics based on selected timeframe
  const displayIncome = timeframe === "month" ? stats.monthlyIncome : stats.allTimeIncome;
  const displaySpent = timeframe === "month" ? stats.monthlyExpenses : stats.allTimeExpenses;
  const displayBalance = timeframe === "month" ? stats.monthlyBalance : stats.totalBalance;
  const displayProgress = timeframe === "month" ? stats.monthlyProgress : stats.allTimeProgress;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 text-left">
            HI, {currentUser?.displayName?.toUpperCase() || currentUser?.email?.split('@')[0]?.toUpperCase() || "YOU"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">FinFlow</h1>
        </div>
        <button 
          onClick={() => navigate('/settings')} 
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors shadow-sm"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] via-[#a855f7] to-[#ec4899] rounded-[40px] shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]" />
        <div className="relative p-7 sm:p-8 text-white space-y-6">
          
          {/* Top Row: Balance Label & Timeframe Selector */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">
                {timeframe === "month" ? "This Month Net" : "Total Net Balance"}
              </p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">
                {formatCurrency(displayBalance, currency)}
              </h2>
            </div>

            {/* Timeframe Pill Switcher */}
            <div className="bg-black/20 backdrop-blur-md p-1 rounded-full flex items-center border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setTimeframe("month")}
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  timeframe === "month"
                    ? "bg-white text-violet-700 shadow-md font-black"
                    : "text-white/80 hover:text-white"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("all")}
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                  timeframe === "all"
                    ? "bg-white text-violet-700 shadow-md font-black"
                    : "text-white/80 hover:text-white"
                }`}
              >
                All Time
              </button>
            </div>
          </div>
          
          {/* Income and Spent Row */}
          <div className="flex gap-8 sm:gap-12 pt-1 border-t border-white/15">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] uppercase font-extrabold tracking-wider text-emerald-200">
                <span className="p-1 rounded-full bg-emerald-400/20 text-emerald-300">
                  <TrendingUp size={12} />
                </span>
                Total Income
              </p>
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {formatCurrency(displayIncome, currency)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] uppercase font-extrabold tracking-wider text-rose-200">
                <span className="p-1 rounded-full bg-rose-400/20 text-rose-300">
                  <TrendingDown size={12} />
                </span>
                Total Spent
              </p>
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {formatCurrency(displaySpent, currency)}
              </p>
            </div>
          </div>

          {/* Progress Bar & Ratio */}
          <div className="space-y-2 pt-1">
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(displayProgress, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${displayProgress > 90 ? 'bg-rose-400' : 'bg-emerald-300'}`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/90">
              <span>
                {displayIncome > 0
                  ? `${Math.round(displayProgress)}% of income spent`
                  : displaySpent > 0
                  ? `${formatCurrency(displaySpent, currency)} spent (no income logged)`
                  : "No spending recorded yet"}
              </span>
              <span>{timeframe === "month" ? "Current Month" : "All Records"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Add', icon: Plus, path: '/activity', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Planning', icon: Target, path: '/planning', color: 'bg-rose-50 text-rose-600' },
          { label: 'Coach', icon: Sparkles, path: '/ai-advisor', color: 'bg-cyan-50 text-cyan-600' },
          { label: 'Reports', icon: FileText, path: '/reports', color: 'bg-amber-50 text-amber-600' },
        ].map((item) => (
          <Link key={item.label} to={item.path} className="flex flex-col items-center gap-2 group">
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-1 shadow-sm`}>
              <item.icon size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Empty State / Quick-Start Banner if 0 Transactions */}
      {!loadingTransactions && transactions.length === 0 && (
        <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-[32px] p-6 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-violet-600 shadow-md">
            <Wallet size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Start Tracking Your Finances</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Add your first income or expense to see real-time cash flow and charts on your dashboard.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => navigate('/activity')}
              className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-700 transition shadow-sm active:scale-95"
            >
              + Add Transaction
            </button>
            <button
              onClick={handleSeedDemoData}
              disabled={seeding}
              className="px-5 py-2.5 bg-white text-violet-700 border border-violet-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-50 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {seeding ? "Loading..." : "Load Sample Data"}
            </button>
          </div>
        </div>
      )}

      {/* Recent Transactions List on Dashboard */}
      {transactions.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-gray-900 leading-none">Recent Activity</h3>
            <Link to="/activity" className="text-xs font-bold text-violet-600 uppercase tracking-widest hover:underline">
              View All ({transactions.length})
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-[32px] p-4 sm:p-5 shadow-sm divide-y divide-gray-50">
            {transactions.slice(0, 4).map((tx) => {
              const isGoal = tx.category === "Savings & Goals" || tx.name.toLowerCase().includes("goal");
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4 first:pt-1 last:pb-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isGoal
                        ? "bg-violet-50 text-violet-600"
                        : tx.type === "income"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-500"
                    }`}>
                      {isGoal ? <Target size={20} /> : tx.type === "income" ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-gray-900">{tx.name}</h4>
                        {isGoal && (
                          <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[8px] font-black rounded-full uppercase tracking-wider">
                            Savings
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        {tx.category} • {format(tx.date, "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-black text-sm tracking-tight ${
                      isGoal
                        ? "text-violet-600"
                        : tx.type === "income"
                        ? "text-emerald-600"
                        : "text-gray-900"
                    }`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Budgets Summary */}
      {budgets.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-gray-900 leading-none">Your Budgets</h3>
            <button onClick={() => navigate('/planning')} className="text-xs font-bold text-[#7c3aed] uppercase tracking-widest">
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget) => {
              const startOfThisMonth = startOfMonth(new Date());
              const spent = transactions
                .filter(t => t.type === 'expense' && t.category === budget.category && t.date >= startOfThisMonth)
                .reduce((acc, t) => acc + Number(t.amount), 0);
              const progress = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
              return (
                <div key={budget.id} className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-sm text-gray-900">{budget.category}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                       {formatCurrency(spent, currency)} / {formatCurrency(budget.limit, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full ${progress > 90 ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Savings Goals Section */}
      {goals.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-gray-900 leading-none">Savings Goals</h3>
            <button onClick={() => navigate('/planning')} className="text-xs font-bold text-violet-600 uppercase tracking-widest hover:underline">
              View All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const current = Number(goal.current) || 0;
              const target = Number(goal.target) || 1;
              const progress = Math.min((current / target) * 100, 100);
              return (
                <div 
                  key={goal.id} 
                  onClick={() => navigate('/planning')}
                  className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm hover:border-violet-100 transition cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Target size={16} />
                      </div>
                      <span className="font-bold text-sm text-gray-900">{goal.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {formatCurrency(current, currency)} / {formatCurrency(target, currency)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-violet-600 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    <span>{progress.toFixed(0)}% Saved</span>
                    <span className="text-violet-600">Goal Target</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coming up Section */}
      {bills.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-gray-900 leading-none">Coming up</h3>
            <button onClick={() => navigate('/recurring')} className="text-xs font-bold text-[#7c3aed] uppercase tracking-widest">
              Manage
            </button>
          </div>
          
          <div 
            onClick={() => navigate('/recurring')}
            className="bg-amber-50 p-6 rounded-[32px] flex items-center gap-4 group cursor-pointer border border-amber-100/50 active:scale-95 transition-all"
          >
             <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <Bell size={24} />
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-gray-900">{formatCurrency(totalMonthlyUpcoming, currency)} due this month</h4>
                <p className="text-xs text-gray-500 font-medium tracking-tight">{bills.length} {bills.length === 1 ? 'bill' : 'bills'}</p>
             </div>
             <ChevronRight className="text-amber-300 group-hover:translate-x-1 transition-transform" />
          </div>
          
          {bills.slice(0, 2).map((bill) => (
            <div 
              key={bill.id}
              onClick={() => navigate('/recurring')}
              className="bg-white border border-gray-100 rounded-[32px] p-6 flex items-center gap-4 shadow-sm cursor-pointer active:scale-95 transition-all"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                  <FileText size={24} />
              </div>
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-bold rounded-full uppercase tracking-widest">
                       Day {bill.dayOfMonth}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">{bill.name}</h4>
                  <p className="text-lg font-bold tracking-tight">{formatCurrency(bill.amount, currency)}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{bill.category}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* AI Insights */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-bold text-gray-900 leading-none">AI insights</h3>
          <Sparkles size={18} className="text-[#a78bfa]" />
        </div>
        <div className="space-y-4">
          {loadingInsights ? (
             <div className="h-40 bg-gray-50 rounded-[40px] animate-pulse" />
          ) : (
            insights.map((insight, i) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="bg-white border border-gray-100 rounded-[32px] p-6 flex gap-4 shadow-sm hover:border-[#a78bfa]/30 transition-all cursor-default group"
              >
                 <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${i % 2 === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-violet-50 text-violet-500'}`}>
                    {i % 2 === 0 ? <TrendingDown className="rotate-180" size={24} /> : <PieChart size={24} />}
                 </div>
                 <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{insight.split(':')[0]}</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                       {insight.includes(':') ? insight.split(':')[1] : insight}
                    </p>
                 </div>
              </motion.div>
            ))
          )}
        </div>
        
        {/* Chat Callout */}
        <div 
           onClick={() => navigate('/ai-advisor')}
           className="bg-gradient-to-r from-[#a78bfa] to-[#f472b6] rounded-[32px] p-1 shadow-lg group cursor-pointer active:scale-[0.98] transition-all"
        >
           <div className="bg-[#7c3aed] text-white rounded-[31px] p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Bell size={20} />
                 </div>
                 <div>
                    <h4 className="font-bold text-sm">Talk to FinFlow Coach</h4>
                    <p className="text-[10px] opacity-70 uppercase font-bold tracking-widest">Ask anything about your money</p>
                 </div>
              </div>
              <ChevronRight className="group-hover:translate-x-1 transition-transform" />
           </div>
        </div>
      </section>
    </div>
  );
}
