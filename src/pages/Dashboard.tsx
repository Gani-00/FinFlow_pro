import { motion } from "motion/react";
import { Plus, Wallet, PieChart, Target, FileText, Settings, ChevronRight, TrendingUp, TrendingDown, Sparkles, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFinancialInsights } from "../services/geminiService";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";

export default function Dashboard() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalBalance: 0, income: 0, expenses: 0, progress: 0 });
  const [bills, setBills] = useState<any[]>([]);
  const totalMonthlyUpcoming = bills.reduce((acc, b) => acc + Number(b.amount), 0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const txQuery = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("date", "desc")
    );

    const billsQuery = query(
      collection(db, "recurring"),
      where("userId", "==", auth.currentUser.uid),
      limit(2)
    );

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let inc = 0;
      let exp = 0;
      
      txs.forEach((tx: any) => {
        const amount = Number(tx.amount);
        if (tx.type === 'income') inc += amount;
        else exp += amount;
      });

      const spentPercentage = inc > 0 ? (exp / inc) * 100 : 0;

      setStats({
        totalBalance: inc - exp,
        income: inc,
        expenses: exp,
        progress: Math.min(spentPercentage, 100)
      });
      setTransactions(txs.slice(0, 5));

      if (txs.length > 0 && insights.length === 0) {
        triggerInsights(txs);
      }
    });

    const unsubscribeBills = onSnapshot(billsQuery, (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTx();
      unsubscribeBills();
    };
  }, []);

  const triggerInsights = async (txs: any[]) => {
    if (loadingInsights) return;
    setLoadingInsights(true);
    try {
      const newInsights = await getFinancialInsights(txs);
      setInsights(newInsights);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header - Page 1 */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">HI, {auth.currentUser?.displayName?.toUpperCase() || "YOU"}</p>
          <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">FinFlow</h1>
        </div>
        <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Main Balance Card - Page 1 */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#a78bfa] to-[#f472b6] rounded-[40px] shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" />
        <div className="relative p-8 text-white space-y-6">
          <div className="space-y-1">
             <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">April 2026 Balance</p>
             <h2 className="text-5xl font-bold tracking-tighter">₹{stats.totalBalance.toLocaleString()}</h2>
          </div>
          
          <div className="flex gap-10">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                <TrendingDown className="rotate-180" size={10} /> Income
              </p>
              <p className="text-xl font-bold">₹{(stats.income / 1000).toFixed(1)}L</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                <TrendingUp size={10} /> Spent
              </p>
              <p className="text-xl font-bold">₹{(stats.expenses / 1000).toFixed(1)}K</p>
            </div>
          </div>

          <div className="space-y-3">
             <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.progress}%` }}
                  className="h-full bg-white rounded-full" 
                />
             </div>
             <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{Math.round(stats.progress)}% of income spent</p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons - Page 1 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Add', icon: Plus, path: '/activity', color: 'bg-indigo-50 text-indigo-500' },
          { label: 'Budgets', icon: PieChart, path: '/budgets', color: 'bg-rose-50 text-rose-500' },
          { label: 'Goals', icon: Target, path: '/goals', color: 'bg-cyan-50 text-cyan-500' },
          { label: 'Reports', icon: FileText, path: '/reports', color: 'bg-amber-50 text-amber-500' },
        ].map((item) => (
          <Link key={item.label} to={item.path} className="flex flex-col items-center gap-2 group">
            <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center transition-transform group-hover:-translate-y-1 shadow-sm`}>
              <item.icon size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Coming up Section - Page 1 */}
      {bills.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-bold text-gray-900 leading-none">Coming up</h3>
            <button onClick={() => navigate('/recurring')} className="text-xs font-bold text-[#7c3aed] uppercase tracking-widest">Manage</button>
          </div>
          
          <div 
            onClick={() => navigate('/recurring')}
            className="bg-amber-50 p-6 rounded-[32px] flex items-center gap-4 group cursor-pointer border border-amber-100/50 active:scale-95 transition-all"
          >
             <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <Bell size={24} />
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-gray-900">₹{totalMonthlyUpcoming.toLocaleString()} due this month</h4>
                <p className="text-xs text-gray-500 font-medium tracking-tight">{bills.length} {bills.length === 1 ? 'bill' : 'bills'}</p>
             </div>
             <ChevronRight className="text-amber-300 group-hover:translate-x-1 transition-transform" />
          </div>
          
          {bills.map((bill, i) => (
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
                  <p className="text-lg font-bold tracking-tight">₹{(bill.amount / 1000).toFixed(1)}K</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{bill.category}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* AI Insights - Page 2 style */}
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
        
        {/* Chat Callout - Page 2 */}
        <div 
           onClick={() => navigate('/shared')}
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
