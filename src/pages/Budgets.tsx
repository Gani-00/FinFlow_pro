import { motion, AnimatePresence } from "motion/react";
import { Plus, Target, AlertCircle, X, Trash2, PieChart, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
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

type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
  color: string;
};

const CATEGORIES = [
  { name: "Shopping", color: "bg-blue-500" },
  { name: "Food", color: "bg-rose-500" },
  { name: "Home", color: "bg-emerald-500" },
  { name: "Travel", color: "bg-amber-500" },
  { name: "Healthcare", color: "bg-purple-500" },
  { name: "Other", color: "bg-gray-500" }
];

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: "Shopping", limit: "" });

  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const qB = query(collection(db, "budgets"), where("userId", "==", auth.currentUser.uid));
    const unsubscribeB = onSnapshot(qB, (snapshot) => {
      const bList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const transformed = bList.map((b: any) => {
          const config = CATEGORIES.find(c => c.name === b.category) || CATEGORIES[CATEGORIES.length - 1];
          return {
              ...b,
              spent: 0,
              color: config.color
          };
      });
      setBudgets(transformed);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "budgets"));

    const qT = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid), where("type", "==", "expense"));
    const unsubscribeT = onSnapshot(qT, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data());
      setTransactions(txs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "transactions"));

    return () => {
      unsubscribeB();
      unsubscribeT();
    };
  }, []);

  const budgetsWithSpent = budgets.map(b => {
      const spent = transactions
          .filter(t => t.category === b.category)
          .reduce((acc, t) => acc + Number(t.amount), 0);
      return { ...b, spent };
  });

  const totalBudgeted = budgetsWithSpent.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgetsWithSpent.reduce((acc, b) => acc + b.spent, 0);
  const remaining = Math.max(0, totalBudgeted - totalSpent);
  const totalPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const limit = Number(newBudget.limit);
    if (isNaN(limit) || limit <= 0) {
      setFormError("Please enter a valid limit greater than 0");
      return;
    }
    setFormError(null);
    try {
      await addDoc(collection(db, "budgets"), {
        userId: auth.currentUser.uid,
        category: newBudget.category,
        limit: limit
      });
      setIsModalOpen(false);
      setNewBudget({ category: "Shopping", limit: "" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "budgets");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget) return;
    const limit = Number(editingBudget.limit);
    if (isNaN(limit) || limit <= 0) {
      setFormError("Please enter a valid limit greater than 0");
      return;
    }
    setFormError(null);
    try {
      await updateDoc(doc(db, "budgets", editingBudget.id), {
        limit: limit
      });
      setEditingBudget(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `budgets/${editingBudget.id}`);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removeBudget = async (id: string) => {
    try {
      await deleteDoc(doc(db, "budgets", id));
      if (editingBudget?.id === id) setEditingBudget(null);
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `budgets/${id}`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Month Strategy</h2>
        <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Budgets</h1>
      </div>

      {/* Main Budget Card - Page 10 */}
      <div className="bg-white border border-gray-100 rounded-[40px] p-8 space-y-6 shadow-sm">
         <div className="flex justify-between items-start">
            <div>
               <h3 className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">April 2026 Budgets</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-violet-500">Auto-Renewing</p>
            </div>
            <button 
               onClick={() => setIsModalOpen(true)}
               className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all"
            >
               <Plus size={20} />
            </button>
         </div>

         <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-2xl p-4">
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Budgeted</p>
               <p className="text-sm font-bold tracking-tight text-gray-900">₹{totalBudgeted.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Spent</p>
               <p className="text-sm font-bold tracking-tight text-rose-500">₹{totalSpent.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-right">
               <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1 leading-none">Left</p>
               <p className="text-sm font-bold tracking-tight text-emerald-500">₹{remaining.toLocaleString()}</p>
            </div>
         </div>

         <div className="space-y-2 px-1">
            <div className="flex justify-between items-end">
               <p className="text-xs font-extrabold text-gray-900 uppercase tracking-tighter">Total Usage</p>
               <p className="text-lg font-black tracking-tighter text-violet-600">{totalPercentage.toFixed(0)}%</p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${totalPercentage}%` }}
                  className={`h-full rounded-full ${totalPercentage > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'}`}
               />
            </div>
         </div>
      </div>

      {/* Category Grid - Page 10 */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] px-1">Category Breakdown</h3>
      <div className="grid grid-cols-1 gap-4">
        {budgetsWithSpent.map((budget) => {
          const percentage = Math.min((budget.spent / budget.limit) * 100, 100);
          const isOver = budget.spent > budget.limit;
          const left = budget.limit - budget.spent;
          
          return (
            <motion.div 
               layout
               key={budget.id}
               onClick={() => setEditingBudget(budget)}
               className="bg-white border border-gray-50 rounded-[32px] p-6 shadow-sm group hover:border-violet-100 transition-all cursor-pointer active:scale-[0.99]"
            >
               <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 ${budget.color} bg-opacity-10 text-gray-900 rounded-2xl flex items-center justify-center`}>
                     <Target size={24} />
                  </div>
                  <div className="flex-1">
                     <h4 className="font-extrabold text-gray-900 text-sm leading-none pb-1">{budget.category}</h4>
                     <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Limit: ₹{budget.limit.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsDeleting(budget.id); }} 
                        className="p-2 text-gray-200 hover:text-rose-500 transition-all"
                      >
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-violet-600'}`}
                     />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                     <span className={isOver ? 'text-rose-500' : 'text-gray-400'}>
                        {isOver ? 'Limit Exceeded' : `${percentage.toFixed(0)}% Utilized`}
                     </span>
                     <span className={isOver ? 'text-rose-500' : 'text-emerald-500'}>
                        {isOver ? `Over by ₹${Math.abs(left).toLocaleString()}` : `₹${left.toLocaleString()} Left`}
                     </span>
                  </div>
               </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {editingBudget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBudget(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 space-y-8">
               <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter">Edit Budget</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{editingBudget.category} Limit</p>
               </div>

               {formError && (
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                    {formError}
                  </div>
               )}

               <form onSubmit={handleEdit} className="space-y-6">
                  <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">New Monthly Limit</label>
                     <input 
                        type="number" required autoFocus
                        className="w-full bg-gray-50 border-none rounded-2xl p-6 text-center text-3xl font-black text-gray-900 focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                        value={editingBudget.limit} onChange={e => setEditingBudget({...editingBudget, limit: Number(e.target.value)})}
                     />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => setIsDeleting(editingBudget.id)} className="bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-500 transition-all">Delete</button>
                     <button type="submit" className="bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-violet-100 hover:opacity-90 transition-all">Update</button>
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
                   <Target size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight">Remove Budget?</h3>
                   <p className="text-sm font-bold text-gray-400">This will stop tracking limits for this category. Past data remains safe.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setIsDeleting(null)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                   <button onClick={() => removeBudget(isDeleting)} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Delete</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black tracking-tight">Setup Budget</h2>
                  <button onClick={() => { setIsModalOpen(false); setFormError(null); }} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
               </div>

               {formError && (
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-tight flex items-center gap-2">
                    {formError}
                  </div>
               )}

               <form onSubmit={handleAdd} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Category</label>
                        <select 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all"
                           value={newBudget.category} onChange={e => setNewBudget({...newBudget, category: e.target.value})}
                        >
                           {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8]">Monthly Limit</label>
                        <input 
                           type="number" required placeholder="0.00"
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all"
                           value={newBudget.limit} onChange={e => setNewBudget({...newBudget, limit: e.target.value})}
                        />
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-[#7c3aed] text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:opacity-90 transition-all">Enable Strategy</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
