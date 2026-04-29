import { useState, useEffect } from "react";
import { collection, query, getDocs, where } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { motion } from "motion/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, TrendingDown, Clock, Activity as ActivityIcon } from "lucide-react";

export default function Reports() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "transactions"), where("userId", "==", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date()
        }));
        setTransactions(data);
        setLoading(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "transactions");
      }
    }
    fetchData();
  }, []);

  const totalIncome = transactions.filter(t => t.type === "income" && t.amount).reduce((acc, t) => acc + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense" && t.amount).reduce((acc, t) => acc + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;

  // Process data for charts
  const categoryData = transactions
    .filter(t => t.type === "expense")
    .reduce((acc: any[], t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += Number(t.amount);
      } else {
        acc.push({ name: t.category, value: Number(t.amount) });
      }
      return acc;
    }, []);

  const COLORS = ['#8b5cf6', '#ec4899', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b'];

  if (loading) return <div>Loading reports...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Insights & Analytics</h2>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
      </div>

      {!transactions.length && !loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
           <ActivityIcon size={48} className="mx-auto text-gray-200 mb-4" />
           <h3 className="text-lg font-bold text-gray-900">No data yet</h3>
           <p className="text-sm text-gray-500 max-w-xs mx-auto">Add some transactions to see your financial analytics here.</p>
        </div>
      ) : (
        <>
          {/* Summary Card - Styled like PDF page 11 */}
          <div className="relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#a78bfa] to-[#f472b6] opacity-90 rounded-3xl" />
             <div className="relative p-8 text-white">
                <div className="flex justify-between items-center mb-10">
                   <div>
                      <p className="text-sm font-medium tracking-wide opacity-80 uppercase mb-1">April 2026</p>
                      <h3 className="text-sm font-bold opacity-80 uppercase">Net</h3>
                      <p className="text-4xl font-bold tracking-tighter">₹{netBalance.toLocaleString()}</p>
                   </div>
                </div>
                
                <div className="flex gap-10">
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">Income</p>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <TrendingDown size={12} className="rotate-180" />
                         </div>
                         <span className="text-lg font-bold">₹{(totalIncome / 1000).toFixed(1)}L</span>
                      </div>
                   </div>
                   <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">Spent</p>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                            <TrendingUp size={12} />
                         </div>
                         <span className="text-lg font-bold">₹{(totalExpense / 1000).toFixed(1)}K</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Spending Trend - Page 11 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900">
                Spending — last 7 days
             </h3>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={transactions.slice(0, 7)}>
                      <Line 
                         type="monotone" 
                         dataKey="amount" 
                         stroke="#ec4899" 
                         strokeWidth={3} 
                         dot={{ fill: '#ec4899', strokeWidth: 2, r: 4 }} 
                         activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Category Breakdown - Page 11 */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold mb-6 text-gray-900">By category — april 2026</h3>
             <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full h-[200px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                         >
                            {categoryData.map((_, index) => (
                               <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                         </Pie>
                         <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="w-full space-y-3">
                   {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm font-medium text-gray-600">{item.name}</span>
                         </div>
                         <span className="text-sm font-bold text-gray-900">₹{(item.value / 1000).toFixed(1)}K</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
