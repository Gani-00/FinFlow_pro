import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Target, AlertCircle, X, Trash2, PieChart, Wallet, 
  Trophy, Car, Home, Laptop, Plane, TrendingUp, ChevronRight 
} from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { useCurrency, formatCurrency } from "../services/currencyService";
import { startOfMonth } from "date-fns";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  doc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

// --- Types ---
type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  color: string;
};

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
  color: string;
};

// --- Constants ---
const BUDGET_CATEGORIES = [
  { name: "Shopping", color: "bg-blue-500" },
  { name: "Food", color: "bg-rose-500" },
  { name: "Home", color: "bg-emerald-500" },
  { name: "Travel", color: "bg-amber-500" },
  { name: "Healthcare", color: "bg-purple-500" },
  { name: "Other", color: "bg-gray-500" }
];

const GOAL_ICONS = [
  { name: "Car", icon: Car },
  { name: "Home", icon: Home },
  { name: "Laptop", icon: Laptop },
  { name: "Plane", icon: Plane },
  { name: "Trophy", icon: Trophy },
];

export default function Planning() {
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState<"budgets" | "goals">("budgets");

  // --- Common States ---
  const [transactions, setTransactions] = useState<any[]>([]);

  // --- Budgets States ---
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: "Shopping", limit: "" });
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);
  const [isDeletingBudget, setIsDeletingBudget] = useState<string | null>(null);

  // --- Goals States ---
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [newGoal, setNewGoal] = useState({ name: "", target: "", icon: "Trophy" });
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch Budgets
    const qB = query(collection(db, "budgets"), where("userId", "==", auth.currentUser.uid));
    const unsubscribeB = onSnapshot(qB, (snapshot) => {
      const bList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const transformed = bList.map((b: any) => {
          const config = BUDGET_CATEGORIES.find(c => c.name === b.category) || BUDGET_CATEGORIES[BUDGET_CATEGORIES.length - 1];
          return {
              ...b,
              spent: 0,
              color: config.color
          };
      });
      setBudgets(transformed);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "budgets"));

    // Fetch Transactions (for budgets)
    const qT = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid), where("type", "==", "expense"));
    const unsubscribeT = onSnapshot(qT, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => doc.data()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "transactions"));

    // Fetch Goals
    const qG = query(collection(db, "goals"), where("userId", "==", auth.currentUser.uid));
    const unsubscribeG = onSnapshot(qG, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "goals"));

    return () => {
      unsubscribeB();
      unsubscribeT();
      unsubscribeG();
    };
  }, []);

  // --- Budgets Logic ---
  const budgetsWithSpent = budgets.map(b => {
    const startOfThisMonth = startOfMonth(new Date());
    const spent = transactions
      .filter(t => t.category === b.category && new Date(t.date) >= startOfThisMonth)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    return { ...b, spent };
  });

  const totalBudgeted = budgetsWithSpent.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgetsWithSpent.reduce((acc, b) => acc + b.spent, 0);
  const remainingBudget = Math.max(0, totalBudgeted - totalSpent);
  const totalBudgetPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const limit = Number(newBudget.limit);
    if (isNaN(limit) || limit <= 0) {
      setBudgetFormError("Please enter a valid limit greater than 0");
      return;
    }
    setBudgetFormError(null);
    try {
      await addDoc(collection(db, "budgets"), {
        userId: auth.currentUser.uid,
        category: newBudget.category,
        limit: limit
      });
      setIsBudgetModalOpen(false);
      setNewBudget({ category: "Shopping", limit: "" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "budgets");
    }
  };

  const handleEditBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const limit = Number(editingBudget.limit);
    if (isNaN(limit) || limit <= 0) {
      setBudgetFormError("Please enter a valid limit greater than 0");
      return;
    }
    setBudgetFormError(null);
    try {
      await updateDoc(doc(db, "budgets", editingBudget.id), { limit: limit });
      setEditingBudget(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `budgets/${editingBudget.id}`);
    }
  };

  // --- Goals Logic ---
  const totalGoalTarget = goals.reduce((acc, g) => acc + g.target, 0);
  const totalGoalCurrent = goals.reduce((acc, g) => acc + g.current, 0);
  const totalGoalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0;

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "goals"), {
        userId: auth.currentUser.uid,
        name: newGoal.name,
        target: Number(newGoal.target),
        current: 0,
        icon: newGoal.icon,
        color: "bg-violet-500"
      });
      setIsGoalModalOpen(false);
      setNewGoal({ name: "", target: "", icon: "Trophy" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "goals");
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      await updateDoc(doc(db, "goals", selectedGoal.id), {
        current: selectedGoal.current + Number(addFundsAmount)
      });
      setIsAddFundsOpen(false);
      setAddFundsAmount("");
      setSelectedGoal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${selectedGoal.id}`);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Header & Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Financial Strategy</h2>
          <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Planning</h1>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl w-full max-w-sm">
          <button 
            onClick={() => setActiveTab("budgets")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'budgets' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <PieChart size={18} /> Budgets
          </button>
          <button 
            onClick={() => setActiveTab("goals")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'goals' ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Target size={18} /> Goals
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "budgets" ? (
          <motion.div 
            key="budgets"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Budgets Overiview Card */}
            <div className="bg-white border border-gray-100 rounded-[40px] p-8 space-y-6 shadow-sm">
               <div className="flex justify-between items-start">
                  <div>
                     <h3 className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">Monthly Budgets</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-violet-500">Expense Tracking</p>
                  </div>
                  <button onClick={() => setIsBudgetModalOpen(true)} className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">
                     <Plus size={20} />
                  </button>
               </div>

               <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-2xl p-4">
                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Budgeted</p>
                     <p className="text-sm font-bold tracking-tight text-gray-900">{formatCurrency(totalBudgeted, currency)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Spent</p>
                     <p className="text-sm font-bold tracking-tight text-rose-500">{formatCurrency(totalSpent, currency)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-right">
                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Left</p>
                     <p className="text-sm font-bold tracking-tight text-emerald-500">{formatCurrency(remainingBudget, currency)}</p>
                  </div>
               </div>

               <div className="space-y-2 px-1">
                  <div className="flex justify-between items-end">
                     <p className="text-xs font-extrabold text-gray-900 uppercase tracking-tighter">Total Usage</p>
                     <p className="text-lg font-black tracking-tighter text-violet-600">{totalBudgetPercentage.toFixed(0)}%</p>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totalBudgetPercentage}%` }}
                        className={`h-full rounded-full ${totalBudgetPercentage > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'}`}
                     />
                  </div>
               </div>
            </div>

            {/* Budgets List */}
            <div className="grid grid-cols-1 gap-4">
              {budgetsWithSpent.map((budget) => {
                const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
                const isOver = budget.spent > budget.limit;
                const left = budget.limit - budget.spent;
                return (
                  <motion.div 
                     layout key={budget.id} onClick={() => setEditingBudget(budget)}
                     className="bg-white border border-gray-50 rounded-[32px] p-6 shadow-sm group hover:border-violet-100 transition-all cursor-pointer active:scale-[0.99]"
                  >
                     <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 ${budget.color} bg-opacity-10 text-gray-900 rounded-2xl flex items-center justify-center`}>
                           <PieChart size={24} />
                        </div>
                        <div className="flex-1">
                           <h4 className="font-extrabold text-gray-900 text-sm leading-none pb-1">{budget.category}</h4>
                           <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Limit: {formatCurrency(budget.limit, currency)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setIsDeletingBudget(budget.id); }} className="p-2 text-gray-200 hover:text-rose-500 transition-all">
                           <Trash2 size={16} />
                        </button>
                     </div>
                     <div className="space-y-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-violet-600'}`} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                           <span className={isOver ? 'text-rose-500' : 'text-gray-400'}>{isOver ? 'Limit Exceeded' : `${percentage.toFixed(0)}% Utilized`}</span>
                           <span className={isOver ? 'text-rose-500' : 'text-emerald-500'}>{isOver ? `Over by ${formatCurrency(Math.abs(left), currency)}` : `${formatCurrency(left, currency)} Left`}</span>
                        </div>
                     </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="goals"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Goals Overview Card */}
            <div className="bg-white border border-gray-100 rounded-[44px] p-10 flex flex-col items-center gap-8 shadow-sm overflow-hidden relative">
               <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl" />
               <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                     <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-50" />
                     <motion.circle 
                        cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray="628.31" 
                        initial={{ strokeDashoffset: 628.31 }}
                        animate={{ strokeDashoffset: 628.31 - (628.31 * totalGoalProgress) / 100 }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        strokeLinecap="round" className="text-violet-600 shadow-xl" 
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-5xl font-black tracking-tighter text-gray-900">{totalGoalProgress.toFixed(0)}%</span>
                     <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mt-1">Achieved</p>
                  </div>
               </div>
               <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter text-gray-900">{formatCurrency(totalGoalCurrent, currency)}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Collective Savings</p>
               </div>
               <button onClick={() => setIsGoalModalOpen(true)} className="bg-[#7c3aed] text-white w-full py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all">
                  New Target
               </button>
            </div>

            {/* Goals List */}
            <div className="grid grid-cols-1 gap-4">
               {goals.map((goal) => {
                 const prog = Math.min((goal.current / goal.target) * 100, 100);
                 const left = goal.target - goal.current;
                 const IconComp = GOAL_ICONS.find(i => i.name === goal.icon)?.icon || Trophy;
                 return (
                   <motion.div 
                     layout key={goal.id} 
                     onClick={() => { setEditingGoal(goal); setIsEditGoalModalOpen(true); }}
                     className="bg-white border border-gray-50 rounded-[32px] p-6 shadow-sm group hover:border-violet-100 transition-all cursor-pointer active:scale-[0.99]"
                   >
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                            <IconComp size={28} />
                         </div>
                         <div className="flex-1">
                            <h4 className="font-extrabold text-gray-900 text-md leading-none mb-1">{goal.name}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target: {formatCurrency(goal.target, currency)}</p>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); setIsDeletingGoal(goal.id); }} className="p-2 text-gray-200 hover:text-rose-500 transition-all">
                            <Trash2 size={16} />
                         </button>
                      </div>
                      <div className="space-y-2">
                         <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-black text-gray-900 uppercase">Progress</span>
                            <span className="text-lg font-black tracking-tighter text-violet-600">{prog.toFixed(0)}%</span>
                         </div>
                         <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${prog}%` }} className="h-full bg-violet-600 rounded-full" />
                         </div>
                         <div className="flex justify-between pt-1">
                            <p className="text-[10px] font-bold text-gray-400">{left > 0 ? `${formatCurrency(left, currency)} left` : 'Goal Reached!'}</p>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedGoal(goal); setIsAddFundsOpen(true); }} className="text-[11px] font-black text-violet-600 uppercase tracking-tight hover:underline">
                               Add Funds +
                            </button>
                         </div>
                      </div>
                   </motion.div>
                 );
               })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Modals (Consolidated) --- */}
      
      {/* Budget Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBudgetModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black tracking-tight">Setup Budget</h2>
                  <button onClick={() => setIsBudgetModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
               </div>
               <form onSubmit={handleAddBudget} className="space-y-6">
                  <div className="space-y- selection:space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Category</label>
                        <select className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all outline-none" value={newBudget.category} onChange={e => setNewBudget({...newBudget, category: e.target.value})}>
                           {BUDGET_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Monthly Limit</label>
                        <input type="number" required placeholder="0.00" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all outline-none" value={newBudget.limit} onChange={e => setNewBudget({...newBudget, limit: e.target.value})} />
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-[#7c3aed] text-white py-4 rounded-2xl font-bold">Enable Strategy</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGoalModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <h2 className="text-2xl font-black tracking-tight">Set Savings Goal</h2>
               <form onSubmit={handleAddGoal} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Goal Name</label>
                        <input type="text" required placeholder="e.g. New Car" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all" value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})} />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Amount</label>
                        <input type="number" required placeholder="0.00" className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} />
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold">Start Saving</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {isAddFundsOpen && selectedGoal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddFundsOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
                <div className="text-center space-y-2">
                   <h2 className="text-2xl font-black tracking-tight">{selectedGoal.name}</h2>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Adding Funds</p>
                </div>
                <form onSubmit={handleAddFunds} className="space-y-6">
                   <input 
                      type="number" required placeholder="Enter amount..." autoFocus
                      className="w-full bg-gray-50 border-none rounded-2xl p-6 text-center text-3xl font-black text-gray-900 focus:ring-2 focus:ring-violet-50 outline-none transition-all placeholder:text-gray-200"
                      value={addFundsAmount} onChange={e => setAddFundsAmount(e.target.value)}
                   />
                   <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold">Confirm Deposit</button>
                </form>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
