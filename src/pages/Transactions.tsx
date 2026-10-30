import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Trash2, TrendingUp, TrendingDown, X, Target, AlertTriangle, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { db, auth, handleFirestoreError, OperationType, getReadableFirestoreErrorMessage } from "../lib/firebase";
import { useCurrency, formatCurrency } from "../services/currencyService";
import { useToast } from "../context/ToastContext";
import { parseFirestoreDate } from "../utils/dateUtils";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  updateDoc
} from "firebase/firestore";

export const TRANSACTION_CATEGORIES = [
  "Shopping",
  "Food",
  "Home",
  "Travel",
  "Healthcare",
  "Education",
  "Entertainment",
  "Savings & Goals",
  "Salary & Income",
  "Other"
];

type Transaction = {
  id: string;
  name: string;
  category: string;
  amount: number;
  date: Date;
  type: "income" | "expense";
};

export default function Transactions() {
  const { currency } = useCurrency();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [newTx, setNewTx] = useState<{ name: string; amount: string; type: "expense" | "income"; category: string }>({ 
    name: "", 
    amount: "", 
    type: "expense", 
    category: "Shopping" 
  });

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const rawAmount = typeof data.amount === "number" ? data.amount : parseFloat(String(data.amount || 0));
          const normalizedType = String(data.type || "expense").trim().toLowerCase() === "income" ? "income" : "expense";
          return {
            id: docSnap.id,
            name: data.name || "Untitled",
            category: data.category || "General",
            amount: isNaN(rawAmount) ? 0 : Math.abs(rawAmount),
            date: parseFirestoreDate(data.date),
            type: normalizedType,
          } as Transaction;
        });

        // Sort descending by date
        txs.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTransactions(txs);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        toastError(getReadableFirestoreErrorMessage(error));
        handleFirestoreError(error, OperationType.LIST, "transactions");
      }
    );

    return () => unsubscribe();
  }, [currentUser, toastError]);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  // Calculate chronological running balance after each transaction
  const balanceMap = useMemo(() => {
    // Sort ascending (earliest to latest) to accumulate balance
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
  }, [transactions]);

  // Detect transactions that were erroneously marked as Income for goals or savings
  const misclassifiedGoalTxs = transactions.filter(t => 
    t.type === "income" && (
      t.name.toLowerCase().includes("goal") || 
      t.category.toLowerCase().includes("goal") ||
      t.category.toLowerCase().includes("saving")
    )
  );

  const [isFixingGoals, setIsFixingGoals] = useState(false);

  const handleFixMisclassifiedGoals = async () => {
    setIsFixingGoals(true);
    try {
      for (const t of misclassifiedGoalTxs) {
        await updateDoc(doc(db, "transactions", t.id), {
          type: "expense",
          category: "Savings & Goals"
        });
      }
      toastSuccess(`Updated ${misclassifiedGoalTxs.length} goal transaction(s) to Savings Outflow! Your Total Income is now accurate.`);
    } catch (err) {
      toastError(getReadableFirestoreErrorMessage(err));
      handleFirestoreError(err, OperationType.UPDATE, "transactions");
    } finally {
      setIsFixingGoals(false);
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || t.type === filter;
    return matchesSearch && matchesFilter;
  });

  const grouped = filtered.reduce((acc: { [key: string]: Transaction[] }, t) => {
    const dateStr = format(t.date, "MMM dd, yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(t);
    return acc;
  }, {});

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const amount = Number(newTx.amount);
    if (!newTx.name.trim()) {
      setFormError("Please enter a transaction title");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0");
      return;
    }
    setFormError(null);
    try {
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        name: newTx.name.trim(),
        amount: amount,
        type: newTx.type,
        category: newTx.category,
        date: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewTx({ name: "", amount: "", type: "expense", category: "Shopping" });
      toastSuccess("Transaction added successfully!");
    } catch (error) {
      toastError(getReadableFirestoreErrorMessage(error));
      handleFirestoreError(error, OperationType.CREATE, "transactions");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const amount = Number(editingTx.amount);
    if (!editingTx.name.trim()) {
      setFormError("Please enter a transaction title");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0");
      return;
    }
    setFormError(null);
    try {
      const { id, ...data } = editingTx;
      await updateDoc(doc(db, "transactions", id), {
        ...data,
        name: editingTx.name.trim(),
        amount: amount
      });
      setEditingTx(null);
      toastSuccess("Transaction updated successfully!");
    } catch (error) {
      toastError(getReadableFirestoreErrorMessage(error));
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${editingTx.id}`);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removeTx = async (id: string) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      if (editingTx?.id === id) setEditingTx(null);
      setIsDeleting(null);
      toastSuccess("Transaction deleted.");
    } catch (error) {
      toastError(getReadableFirestoreErrorMessage(error));
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">All Transactions</h2>
        <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Activity</h1>
      </div>

      {/* Misclassified Goals Alert & 1-Click Fix */}
      {misclassifiedGoalTxs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-[28px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Target size={22} />
            </div>
            <div>
              <p className="text-xs font-black text-amber-950">
                {misclassifiedGoalTxs.length === 1 ? "1 Goal entry is counted as Income" : `${misclassifiedGoalTxs.length} Goal entries are counted as Income`}
              </p>
              <p className="text-[11px] text-amber-800 font-medium leading-tight mt-0.5">
                Goals represent savings set aside, not earnings. Reclassifying as Savings Outflow corrects your Total Income.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFixMisclassifiedGoals}
            disabled={isFixingGoals}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-700 transition shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isFixingGoals ? "Correcting..." : "Fix to Savings (-)"}
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search notes..."
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-[#a78bfa] transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl">
         {["all", "income", "expense"].map((f) => (
           <button 
             key={f}
             onClick={() => setFilter(f as any)}
             className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
           >
             {f}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <div>
               <p className="text-[8px] font-bold uppercase text-gray-400 tracking-widest leading-none mb-1">Income</p>
               <p className="text-lg font-bold tracking-tight text-gray-900 leading-none">{formatCurrency(totalIncome, currency)}</p>
            </div>
         </div>
         <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <div>
               <p className="text-[8px] font-bold uppercase text-gray-400 tracking-widest leading-none mb-1">Expense</p>
               <p className="text-lg font-bold tracking-tight text-gray-900 leading-none">{formatCurrency(totalExpense, currency)}</p>
            </div>
         </div>
      </div>

      <div className="space-y-8 pb-32">
        {loading ? (
             <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-[32px] animate-pulse" />)}
             </div>
        ) : Object.entries(grouped).map(([date, txs]) => (
          <div key={date} className="space-y-4">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] px-1">{date}</h3>
              <div className="space-y-3">
                {txs.map((tx) => {
                  const isGoalOrSavings = tx.category === "Savings & Goals" || tx.name.toLowerCase().includes("goal") || tx.category.toLowerCase().includes("goal");
                  const balanceAfter = balanceMap[tx.id] ?? 0;
                  const isExpense = tx.type === "expense";

                  return (
                    <motion.div 
                      layout
                      key={tx.id} 
                      onClick={() => setEditingTx(tx)}
                      className="bg-white border border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-violet-200/60 transition-all cursor-pointer active:scale-[0.99] group"
                    >
                      {/* Top Section */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            isGoalOrSavings
                              ? 'bg-violet-50 text-violet-600'
                              : isExpense
                              ? 'bg-rose-50 text-rose-500'
                              : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {isGoalOrSavings ? (
                              <Target size={22} />
                            ) : isExpense ? (
                              <TrendingUp size={22} />
                            ) : (
                              <TrendingDown className="rotate-180" size={22} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-snug truncate">
                                {tx.name}
                              </h4>
                              {isGoalOrSavings && (
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black rounded-full uppercase tracking-wider shrink-0">
                                  Savings
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">
                              {tx.category}
                            </p>
                          </div>
                        </div>

                        {/* Amount + Divider + Delete Button */}
                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                          <p className={`text-base sm:text-lg md:text-xl font-bold tracking-tight ${
                            isGoalOrSavings
                              ? 'text-violet-600'
                              : isExpense
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}>
                            {isExpense ? '-' : '+'}{formatCurrency(tx.amount, currency)}
                          </p>

                          <div className="h-6 sm:h-7 w-px bg-gray-200 shrink-0" />

                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setIsDeleting(tx.id); 
                            }} 
                            title="Delete transaction"
                            aria-label="Delete transaction"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 active:scale-95"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Thin Horizontal Divider */}
                      <hr className="border-t border-gray-100 my-3.5" />

                      {/* Bottom Section */}
                      <div className="flex items-center justify-between flex-wrap gap-y-2 text-xs">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          {/* Date */}
                          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                            <Calendar size={13} className="text-gray-400 shrink-0" />
                            <span>{format(tx.date, "MMM dd, yyyy")}</span>
                          </div>

                          {/* Divider */}
                          <div className="h-3.5 w-px bg-gray-200 shrink-0" />

                          {/* Time */}
                          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                            <Clock size={13} className="text-gray-400 shrink-0" />
                            <span>{format(tx.date, "h:mm a")}</span>
                          </div>
                        </div>

                        {/* Divider on desktop */}
                        <div className="hidden sm:block h-3.5 w-px bg-gray-200 shrink-0" />

                        {/* Balance after transaction */}
                        <div className="flex items-center gap-1.5 ml-auto sm:ml-0 font-medium">
                          <span className="text-gray-400">Balance:</span>
                          <span className="font-bold text-blue-600">
                            {formatCurrency(balanceAfter, currency)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.9, opacity: 0, y: 20 }} 
               className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 space-y-8 text-gray-900"
            >
               <button onClick={() => setEditingTx(null)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-900">
                  <X size={24} />
               </button>

               <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter">Edit Flow</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Update transaction details</p>
               </div>

               {formError && (
                 <div className="p-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                   {formError}
                 </div>
               )}

               <form onSubmit={handleEdit} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Description</label>
                        <input 
                           type="text" required 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                           value={editingTx.name} onChange={e => setEditingTx({...editingTx, name: e.target.value})}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Amount ({currency.symbol})</label>
                           <input 
                              type="number" required 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                              value={editingTx.amount} onChange={e => setEditingTx({...editingTx, amount: Number(e.target.value)})}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Flow Type</label>
                           <select 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                              value={editingTx.type} onChange={e => setEditingTx({...editingTx, type: e.target.value as any})}
                           >
                              <option value="expense">Expense / Savings (-)</option>
                              <option value="income">Income / Earnings (+)</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Category</label>
                        <select 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                           value={editingTx.category} onChange={e => setEditingTx({...editingTx, category: e.target.value})}
                        >
                           {TRANSACTION_CATEGORIES.map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>

                     {editingTx.type === "income" && (editingTx.category === "Savings & Goals" || editingTx.name.toLowerCase().includes("goal") || editingTx.name.toLowerCase().includes("saving")) && (
                       <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-left">
                         <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                         <p className="text-[11px] text-amber-800 leading-tight">
                           <strong>Notice:</strong> Goals represent money set aside into savings, not new earnings. Choose <strong>Expense / Savings (-)</strong> to prevent inflating your Total Income.
                         </p>
                       </div>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4">
                     <button 
                       type="button" 
                       onClick={() => setIsDeleting(editingTx.id)}
                       className="bg-gray-100 text-gray-400 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all"
                     >
                        Delete
                     </button>
                     <button 
                       type="submit" 
                       className="bg-violet-600 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all"
                     >
                        Save
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleting(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                   <Trash2 size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight">Delete Transaction?</h3>
                   <p className="text-sm font-bold text-gray-400">This action cannot be undone. It will be removed from your reports instantly.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setIsDeleting(null)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                   <button onClick={() => removeTx(isDeleting)} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Delete</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-6">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-extrabold tracking-tight">New Transaction</h2>
                  <button onClick={() => { setIsModalOpen(false); setFormError(null); }} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
               </div>

               {formError && (
                 <div className="p-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                   {formError}
                 </div>
               )}

               <form onSubmit={handleAdd} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</label>
                        <input 
                           type="text" required 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#a78bfa] transition-all"
                           value={newTx.name} onChange={e => setNewTx({...newTx, name: e.target.value})}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</label>
                           <input 
                              type="number" required 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#a78bfa] transition-all"
                              value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Flow Type</label>
                           <select 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#a78bfa] transition-all"
                              value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as any})}
                           >
                              <option value="expense">Expense / Savings (-)</option>
                              <option value="income">Income / Earnings (+)</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
                        <select 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#a78bfa] transition-all"
                           value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}
                        >
                           {TRANSACTION_CATEGORIES.map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>

                     {newTx.type === "income" && (newTx.category === "Savings & Goals" || newTx.name.toLowerCase().includes("goal") || newTx.name.toLowerCase().includes("saving")) && (
                       <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-left">
                         <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                         <p className="text-[11px] text-amber-800 leading-tight">
                           <strong>Notice:</strong> Goals are savings set aside, not earnings. If this is money for a goal, choose <strong>Expense / Savings (-)</strong> to keep your Total Income accurate.
                         </p>
                       </div>
                     )}
                  </div>
                  <button type="submit" className="w-full bg-[#7c3aed] text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-indigo-200 transition-all cursor-pointer">Add Transaction</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
