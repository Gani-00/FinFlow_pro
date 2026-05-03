import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Trash2, TrendingUp, TrendingDown, X } from "lucide-react";
import { format } from "date-fns";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { useCurrency, formatCurrency } from "../services/currencyService";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  updateDoc
} from "firebase/firestore";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [newTx, setNewTx] = useState({ name: "", amount: "", type: "expense" as const, category: "Shopping" });

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as any)?.toDate?.() || (data.date instanceof Date ? data.date : new Date())
        } as Transaction;
      });
      setTransactions(txs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "transactions"));

    return () => unsubscribe();
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

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
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0");
      return;
    }
    setFormError(null);
    try {
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        name: newTx.name,
        amount: amount,
        type: newTx.type,
        category: newTx.category,
        date: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewTx({ name: "", amount: "", type: "expense", category: "Shopping" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "transactions");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const amount = Number(editingTx.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0");
      return;
    }
    setFormError(null);
    try {
      const { id, ...data } = editingTx;
      await updateDoc(doc(db, "transactions", id), {
        ...data,
        amount: amount
      });
      setEditingTx(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${editingTx.id}`);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removeTx = async (id: string) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      if (editingTx?.id === id) setEditingTx(null);
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">All Transactions</h2>
        <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Activity</h1>
      </div>

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
                {txs.map((tx) => (
                  <motion.div 
                    layout
                    key={tx.id} 
                    onClick={() => setEditingTx(tx)}
                    className="bg-white border border-gray-50 rounded-[32px] p-5 flex items-center gap-4 group hover:border-[#a78bfa]/30 transition-all shadow-sm cursor-pointer active:scale-[0.98]"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-500' : 'bg-violet-50 text-violet-500'}`}>
                      {tx.type === 'income' ? <TrendingDown className="rotate-180" size={24} /> : <TrendingUp size={24} />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-sm leading-none mb-1">{tx.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{tx.category} • {format(tx.date, "h:mm a")}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                       <p className={`text-lg font-bold tracking-tighter ${tx.type === 'income' ? 'text-emerald-500' : 'text-gray-900'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, currency)}
                       </p>
                       <button 
                          onClick={(e) => { e.stopPropagation(); setIsDeleting(tx.id); }} 
                          className="p-1 text-gray-200 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                       </button>
                    </div>
                  </motion.div>
                ))}
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
                              <option value="expense">Expense (-)</option>
                              <option value="income">Income (+)</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Category</label>
                        <select 
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                           value={editingTx.category} onChange={e => setEditingTx({...editingTx, category: e.target.value})}
                        >
                           {["Shopping", "Food", "Home", "Travel", "Healthcare", "Education", "Entertainment", "Other"].map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>
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
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type</label>
                           <select 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-[#a78bfa] transition-all"
                              value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as any})}
                           >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                           </select>
                        </div>
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-[#7c3aed] text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-indigo-200 transition-all">Add Transaction</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
