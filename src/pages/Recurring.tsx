import { motion, AnimatePresence } from "motion/react";
import { Plus, Repeat, Calendar, Trash2, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { useCurrency, formatCurrency } from "../services/currencyService";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { format, setDate, addMonths, isBefore, startOfToday } from "date-fns";

type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  nextDate: Date;
};

export default function Recurring() {
  const { currency } = useCurrency();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBill, setNewBill] = useState({ name: "", amount: "", category: "Subscription", dayOfMonth: "1" });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, "recurring"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bList = snapshot.docs.map(doc => {
        const data = doc.data();
        let nextDate = new Date();
        
        if (data.dayOfMonth) {
          const day = Number(data.dayOfMonth);
          nextDate = setDate(new Date(), day);
          if (isBefore(nextDate, startOfToday())) {
            nextDate = addMonths(nextDate, 1);
          }
        }

        return {
          id: doc.id,
          ...data,
          nextDate
        } as RecurringBill;
      });
      setBills(bList);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "recurring"));

    return () => unsubscribe();
  }, []);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    const amount = Number(newBill.amount);
    const day = Number(newBill.dayOfMonth);

    if (!newBill.name || newBill.name.length > 100) {
      setFormError("Please enter a valid bill name (max 100 chars)");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount greater than 0");
      return;
    }

    if (isNaN(day) || day < 1 || day > 31) {
      setFormError("Please select a valid day of the month");
      return;
    }

    setFormError(null);
    try {
      await addDoc(collection(db, "recurring"), {
        userId: auth.currentUser.uid,
        name: newBill.name.trim(),
        amount: amount,
        category: newBill.category,
        dayOfMonth: day,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewBill({ name: "", amount: "", category: "Subscription", dayOfMonth: "1" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "recurring");
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removeBill = async (id: string) => {
    try {
      await deleteDoc(doc(db, "recurring", id));
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `recurring/${id}`);
    }
  };

  const totalMonthly = bills.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Automated Costs</h2>
        <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Recurring</h1>
      </div>

      <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm">
         <div className="flex justify-between items-start mb-8">
            <div>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Fixed Monthly</p>
               <h3 className="text-4xl font-black tracking-tighter text-gray-900">{formatCurrency(totalMonthly, currency)}</h3>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-4 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all active:scale-95"
            >
               <Plus size={24} />
            </button>
         </div>
         
         <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-2xl text-violet-600">
            <AlertCircle size={18} />
            <p className="text-xs font-bold uppercase tracking-tight">Smart reminders are active for {bills.length} bills</p>
         </div>
      </div>

      <div className="space-y-3">
        {loading ? (
             <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-[32px] animate-pulse" />)}
             </div>
        ) : bills.map((bill) => (
          <motion.div 
            layout
            key={bill.id}
            className="bg-white border border-gray-50 rounded-[32px] p-5 flex items-center justify-between group hover:border-violet-100 transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-50 text-violet-600 rounded-2xl flex items-center justify-center border border-gray-100">
                <Repeat size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm leading-tight">{bill.name}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                   Every Month on {bill.dayOfMonth}{[1,21,31].includes(bill.dayOfMonth) ? 'st' : [2,22].includes(bill.dayOfMonth) ? 'nd' : [3,23].includes(bill.dayOfMonth) ? 'rd' : 'th'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-lg font-black tracking-tighter text-gray-900 leading-none">{formatCurrency(bill.amount, currency)}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Next: {format(bill.nextDate, "MMM dd")}</p>
              </div>
              <button 
                onClick={() => setIsDeleting(bill.id)}
                className="p-2 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
        {bills.length === 0 && !loading && (
            <div className="text-center py-16 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-100">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Subscriptions</p>
            </div>
        )}
      </div>

      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleting(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                   <Repeat size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight">Stop Tracking?</h3>
                   <p className="text-sm font-bold text-gray-400">This bill will be removed from your upcoming schedule and reports.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setIsDeleting(null)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                   <button onClick={() => removeBill(isDeleting)} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Delete</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.9, opacity: 0, y: 20 }} 
               className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 space-y-8"
            >
               <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter">Add Bill</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fixed Monthly Auto-Pay</p>
               </div>

               {formError && (
                 <div className="p-3 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                   {formError}
                 </div>
               )}

               <form onSubmit={handleAddBill} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Subscription Name</label>
                        <input 
                           type="text" required placeholder="Netflix, Rent, etc."
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                           value={newBill.name} onChange={e => setNewBill({...newBill, name: e.target.value})}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Amount</label>
                           <input 
                              type="number" required placeholder="0.00"
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                              value={newBill.amount} onChange={e => setNewBill({...newBill, amount: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Day of Month</label>
                           <select 
                              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                              value={newBill.dayOfMonth} onChange={e => setNewBill({...newBill, dayOfMonth: e.target.value})}
                           >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                 <option key={d} value={d}>Day {d}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-violet-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all">Enable Auto-Track</button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
