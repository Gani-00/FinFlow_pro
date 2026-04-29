import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Target, Trash2, X, Trophy, Car, Home, Laptop, Plane } from "lucide-react";
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

type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
  color: string;
};

const ICONS = [
  { name: "Car", icon: Car },
  { name: "Home", icon: Home },
  { name: "Laptop", icon: Laptop },
  { name: "Plane", icon: Plane },
  { name: "Trophy", icon: Trophy },
];

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");
  const [newGoal, setNewGoal] = useState({ name: "", target: "", icon: "Trophy" });
  const [isQuickSaveOpen, setIsQuickSaveOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, "goals"), where("userId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Goal[];
      setGoals(gList);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "goals"));

    return () => unsubscribe();
  }, []);

  const totalTarget = goals.reduce((acc, g) => acc + g.target, 0);
  const totalCurrent = goals.reduce((acc, g) => acc + g.current, 0);
  const totalProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

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
      setIsModalOpen(false);
      setNewGoal({ name: "", target: "", icon: "Trophy" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "goals");
    }
  };

  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    try {
      await updateDoc(doc(db, "goals", editingGoal.id), {
        name: editingGoal.name,
        target: Number(editingGoal.target),
        icon: editingGoal.icon
      });
      setIsEditModalOpen(false);
      setEditingGoal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${editingGoal.id}`);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      await updateDoc(doc(db, "goals", selectedGoal.id), {
        current: selectedGoal.current + Number(amount)
      });
      setIsAddFundsOpen(false);
      setAmount("");
      setSelectedGoal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${selectedGoal.id}`);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removeGoal = async (id: string) => {
    try {
      await deleteDoc(doc(db, "goals", id));
      if (editingGoal?.id === id) setEditingGoal(null);
      setIsDeleting(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Financial Milestones</h2>
          <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Savings Goals</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-violet-100 hover:scale-110 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[44px] p-10 flex flex-col items-center gap-8 shadow-sm overflow-hidden relative">
         <div className="absolute -top-10 -right-10 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl" />
         <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-600/5 rounded-full blur-3xl" />
         
         <div className="relative w-56 h-56 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
               <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-gray-50" />
               <motion.circle 
                  cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" strokeDasharray="628.31" 
                  initial={{ strokeDashoffset: 628.31 }}
                  animate={{ strokeDashoffset: 628.31 - (628.31 * totalProgress) / 100 }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  strokeLinecap="round" className="text-violet-600 shadow-xl" 
               />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-5xl font-black tracking-tighter text-gray-900">{totalProgress.toFixed(0)}%</span>
               <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mt-1">Achieved</p>
            </div>
         </div>

         <div className="text-center space-y-2">
            <h3 className="text-3xl font-black tracking-tighter text-gray-900">₹{totalCurrent.toLocaleString()}</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Collective Progress Pool</p>
         </div>

         <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => setIsQuickSaveOpen(true)}
              className="bg-[#7c3aed] text-white py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 transition-all"
            >
               Quick Save
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-gray-50 text-gray-400 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all"
            >
               New Target
            </button>
         </div>
      </div>

      {/* Goal Cards Grid - Page 12 */}
      <div className="grid grid-cols-1 gap-4">
         {goals.map((goal) => {
           const prog = Math.min((goal.current / goal.target) * 100, 100);
           const left = goal.target - goal.current;
           const IconComp = ICONS.find(i => i.name === goal.icon)?.icon || Trophy;

           return (
             <motion.div 
               layout
               key={goal.id} 
               onClick={() => { setEditingGoal(goal); setIsEditModalOpen(true); }}
               className="bg-white border border-gray-50 rounded-[32px] p-6 shadow-sm group hover:border-violet-100 transition-all cursor-pointer active:scale-[0.99]"
             >
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600">
                      <IconComp size={28} />
                   </div>
                   <div className="flex-1">
                      <h4 className="font-extrabold text-gray-900 text-md leading-none mb-1">{goal.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target: ₹{goal.target.toLocaleString()}</p>
                   </div>
                   <button 
                      onClick={(e) => { e.stopPropagation(); setIsDeleting(goal.id); }} 
                      className="p-2 text-gray-200 hover:text-rose-500 transition-all"
                    >
                      <Trash2 size={16} />
                   </button>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black text-gray-900 uppercase">Progress</span>
                      <span className="text-lg font-black tracking-tighter text-violet-600">{prog.toFixed(0)}%</span>
                   </div>
                   <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${prog}%` }}
                         className="h-full bg-violet-600 rounded-full"
                      />
                   </div>
                   <div className="flex justify-between pt-1">
                      <p className="text-[10px] font-bold text-gray-400">{left > 0 ? `₹${left.toLocaleString()} left to go` : 'Goal Reached!'}</p>
                      <button 
                         onClick={(e) => { e.stopPropagation(); setSelectedGoal(goal); setIsAddFundsOpen(true); }}
                         className="text-[11px] font-black text-violet-600 uppercase tracking-tight hover:underline"
                      >
                         Add Funds +
                      </button>
                   </div>
                </div>
             </motion.div>
           );
         })}
      </div>

      {/* Quick Save Modal */}
      <AnimatePresence>
        {isQuickSaveOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQuickSaveOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black tracking-tight">Quick Save</h2>
                  <button onClick={() => setIsQuickSaveOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
               </div>
               
               <div className="space-y-2">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Choose Goal</p>
                 <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {goals.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest bg-gray-50 rounded-2xl">
                        No goals found
                      </div>
                    ) : (
                      goals.map(g => {
                        const Icon = ICONS.find(i => i.name === g.icon)?.icon || Trophy;
                        return (
                          <button 
                            key={g.id}
                            onClick={() => { setSelectedGoal(g); setIsQuickSaveOpen(false); setIsAddFundsOpen(true); }}
                            className="w-full flex items-center gap-4 p-4 rounded-3xl bg-gray-50 hover:bg-violet-50 hover:border-violet-100 border border-transparent transition-all text-left group"
                          >
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm transition-transform group-hover:scale-110">
                              <Icon size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-gray-900">{g.name}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">{((g.current/g.target)*100).toFixed(0)}% Achieved</p>
                            </div>
                            <Plus size={16} className="text-violet-400" />
                          </button>
                        );
                      })
                    )}
                 </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

       <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleting(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                   <Target size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight">Abandon Goal?</h3>
                   <p className="text-sm font-bold text-gray-400">This will permanently remove your progress towards this target.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setIsDeleting(null)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                   <button onClick={() => removeGoal(isDeleting)} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Delete</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Goal Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsEditModalOpen(false); setEditingGoal(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <h2 className="text-2xl font-black tracking-tight">Edit Goal</h2>
               <form onSubmit={handleEditGoal} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Goal Name</label>
                        <input 
                           type="text" required
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all"
                           value={editingGoal.name} onChange={e => setEditingGoal({...editingGoal, name: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Amount</label>
                        <input 
                           type="number" required
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all"
                           value={editingGoal.target} onChange={e => setEditingGoal({...editingGoal, target: Number(e.target.value)})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Icon</label>
                        <div className="flex gap-2 justify-between bg-gray-50 p-2 rounded-2xl">
                           {ICONS.map(i => (
                             <button 
                                key={i.name} type="button"
                                onClick={() => setEditingGoal({...editingGoal, icon: i.name})}
                                className={`p-3 rounded-xl transition-all ${editingGoal.icon === i.name ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
                             >
                                <i.icon size={20} />
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => setIsDeleting(editingGoal.id)} className="bg-gray-100 text-gray-400 py-4 rounded-2xl font-bold hover:bg-rose-50 hover:text-rose-500 transition-all">Delete</button>
                     <button type="submit" className="bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-violet-100 hover:opacity-90 transition-all">Update</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 text-gray-900">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-8 space-y-6">
               <h2 className="text-2xl font-black tracking-tight">Set Savings Goal</h2>
               <form onSubmit={handleAddGoal} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Goal Name</label>
                        <input 
                           type="text" required placeholder="e.g. New Car"
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all"
                           value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Target Amount</label>
                        <input 
                           type="number" required placeholder="0.00"
                           className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-violet-50 outline-none transition-all"
                           value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Icon</label>
                        <div className="flex gap-2 justify-between bg-gray-50 p-2 rounded-2xl">
                           {ICONS.map(i => (
                             <button 
                                key={i.name} type="button"
                                onClick={() => setNewGoal({...newGoal, icon: i.name})}
                                className={`p-3 rounded-xl transition-all ${newGoal.icon === i.name ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
                             >
                                <i.icon size={20} />
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:opacity-90 transition-all">Start Saving</button>
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
                      value={amount} onChange={e => setAmount(e.target.value)}
                   />
                   <button type="submit" className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:opacity-90 transition-all">Confirm Deposit</button>
                </form>
             </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
