import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, List, PieChart, BarChart3, Settings, Plus, Target, LogOut, X, Info, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useCurrency } from "../services/currencyService";

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const location = useLocation();
  const { currency } = useCurrency();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ name: "", amount: "", type: "expense" as const, category: "Shopping" });

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Activity", path: "/activity", icon: List },
    { name: "Planning", path: "/planning", icon: Target },
    { name: "AI Coach", path: "/ai-advisor", icon: Sparkles },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "About", path: "/about", icon: Info },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "transactions"), {
        userId: auth.currentUser.uid,
        name: newTx.name,
        amount: Number(newTx.amount),
        type: newTx.type,
        category: newTx.category,
        date: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewTx({ name: "", amount: "", type: "expense", category: "Shopping" });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "transactions");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-gray-900 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 p-8 fixed h-full z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-100">
            <PieChart size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">FinFlow</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all group ${isActive ? "bg-violet-50 text-violet-600" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="group-hover:scale-110 transition-transform" />
                <span className="text-sm tracking-tight">{item.name}</span>
                {isActive && <motion.div layoutId="sidebarActive" className="ml-auto w-1.5 h-1.5 bg-violet-600 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="pt-8 mt-auto border-t border-gray-50">
           <button 
             onClick={onLogout}
             className="flex items-center gap-4 px-5 py-4 w-full text-gray-400 font-bold hover:text-rose-500 transition-colors"
           >
             <LogOut size={22} />
             <span className="text-sm">Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 flex flex-col relative">
        <div className="w-full max-w-2xl mx-auto px-6 py-10 md:py-16 pb-32 md:pb-16 min-h-screen relative">
          <Outlet />
        </div>

        {/* Floating Action Button - Mobile Only */}
        <button 
           onClick={() => setIsAddModalOpen(true)}
           className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-tr from-[#7c3aed] via-[#a78bfa] to-[#f472b6] rounded-2xl shadow-2xl flex items-center justify-center text-white z-40 active:scale-95 transition-all hover:rotate-12"
        >
          <Plus size={28} />
        </button>

        {/* Global Desktop Add Button */}
        <button 
           onClick={() => setIsAddModalOpen(true)}
           className="hidden md:flex fixed bottom-10 right-10 w-16 h-16 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-100 items-center justify-center hover:bg-violet-700 hover:scale-110 active:scale-95 transition-all z-50 group"
        >
          <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/80 backdrop-blur-3xl border border-white/40 rounded-3xl flex items-center justify-around px-2 z-40 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
         {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all relative ${isActive ? "text-violet-600" : "text-gray-400"}`}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[7px] font-bold uppercase tracking-tight leading-none">{item.name}</span>
                {isActive && <motion.div layoutId="bottomNav" className="absolute -top-1 w-6 h-0.5 bg-violet-600 rounded-full" />}
              </Link>
            );
         })}
         <Link to="/settings" className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all ${location.pathname === '/settings' ? "text-violet-600" : "text-gray-400"}`}>
            <Settings size={18} strokeWidth={location.pathname === '/settings' ? 2.5 : 2} />
            <span className="text-[7px] font-bold uppercase tracking-tight leading-none">Settings</span>
         </Link>
      </nav>

      {/* Global Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-8"
            >
               <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors">
                  <X size={24} />
               </button>

               <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tighter">Add Flow</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Transaction Entry</p>
               </div>

               <form onSubmit={handleAddTx} className="space-y-6">
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">What for?</label>
                        <input 
                           type="text" required placeholder="e.g. Morning Coffee"
                           className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-violet-100 focus:bg-white focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                           value={newTx.name} onChange={e => setNewTx({...newTx, name: e.target.value})}
                        />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">How much? ({currency.symbol})</label>
                           <input 
                              type="number" required placeholder="0.00"
                              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-violet-100 focus:bg-white focus:ring-4 focus:ring-violet-50 transition-all outline-none"
                              value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})}
                           />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Flow Type</label>
                           <select 
                              className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-violet-100 focus:bg-white focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                              value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as any})}
                           >
                              <option value="expense">Expense (-)</option>
                              <option value="income">Income (+)</option>
                           </select>
                        </div>
                     </div>

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Category</label>
                        <select 
                           className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold focus:border-violet-100 focus:bg-white focus:ring-4 focus:ring-violet-50 transition-all outline-none appearance-none"
                           value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}
                        >
                           {["Shopping", "Food", "Home", "Travel", "Healthcare", "Education", "Entertainment", "Other"].map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-violet-600 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-violet-100 hover:bg-violet-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                     Confirm Flow
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

