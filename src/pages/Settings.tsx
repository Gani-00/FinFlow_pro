import { useState } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, orderBy, startAt, endAt } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { User, DollarSign, RefreshCw, Download, Trash2, Plus, Bell, Shield, ChevronRight, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const [isResetting, setIsResetting] = useState(false);
  const [showDemoSuccess, setShowDemoSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);

  const handleDemoData = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const txs = [
          { name: "Starbucks Coffee", amount: 450, type: "expense", category: "Food" },
          { name: "Salary Credit", amount: 85000, type: "income", category: "Other" },
          { name: "Amazon Shopping", amount: 2400, type: "expense", category: "Shopping" },
          { name: "Uber Ride", amount: 320, type: "expense", category: "Travel" },
          { name: "Netflix Sub", amount: 649, type: "expense", category: "Entertainment" },
      ];
      
      const batch = writeBatch(db);
      txs.forEach(t => {
          const docRef = doc(collection(db, "transactions"));
          batch.set(docRef, {
              ...t,
              userId: auth.currentUser!.uid,
              date: serverTimestamp()
          });
      });
      await batch.commit();
      setShowDemoSuccess(true);
      setTimeout(() => setShowDemoSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      const uid = auth.currentUser.uid;
      const collections = ["transactions", "budgets", "recurring", "goals"];
      
      for (const coll of collections) {
        const q = query(collection(db, coll), where("userId", "==", uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      setIsResetting(false);
      setShowResetSuccess(true);
      setTimeout(() => setShowResetSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "all");
    } finally {
      setLoading(false);
    }
  };

  const getTransactions = async () => {
    if (!auth.currentUser) return [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid),
      where("date", ">=", startOfMonth),
      orderBy("date", "desc")
    );
    
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date?.toDate?.() || new Date()
      }));
    } catch (error) {
      // If index is missing, fall back to non-filtered and filter client-side
      console.warn("Firestore index might be missing, falling back to client-side filtering", error);
      const qFallback = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(qFallback);
      return snapshot.docs
        .map(doc => ({
          ...doc.data(),
          id: doc.id,
          date: doc.data().date?.toDate?.() || new Date()
        }))
        .filter(t => t.date >= startOfMonth);
    }
  };

  const downloadCSV = async () => {
    setLoading(true);
    try {
      const txs = await getTransactions();
      const headers = ["Date", "Name", "Category", "Type", "Amount"];
      const rows = txs.map((t: any) => [
        t.date.toLocaleDateString(),
        t.name,
        t.category,
        t.type,
        t.amount
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(r => r.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `FinFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setLoading(true);
    try {
      const txs = await getTransactions();
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(124, 58, 237); // #7c3aed
      doc.text("FinFlow Pro", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Monthly Spending Statement", 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 35);
      
      const tableData = txs.map((t: any) => [
        t.date.toLocaleDateString(),
        t.name,
        t.category,
        t.type.toUpperCase(),
        `₹${t.amount.toLocaleString()}`
      ]);

      autoTable(doc, {
        startY: 45,
        head: [["Date", "Description", "Category", "Type", "Amount"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237] },
        styles: { fontSize: 9, cellPadding: 4 }
      });

      const totalExpense = txs
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const totalIncome = txs
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total Income: ₹${totalIncome.toLocaleString()}`, 14, finalY);
      doc.text(`Total Expenses: ₹${totalExpense.toLocaleString()}`, 14, finalY + 7);
      doc.text(`Net Balance: ₹${(totalIncome - totalExpense).toLocaleString()}`, 14, finalY + 14);

      doc.save(`FinFlow_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currencies = [
    { code: "INR", symbol: "₹" },
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "JPY", symbol: "¥" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32">
       <div className="flex flex-col gap-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">Personalise Your Finances</h2>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
      </div>

      {/* User Card - Page 13 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#a78bfa] to-[#f472b6] rounded-[40px] p-8 text-white shadow-xl">
          <div className="flex flex-col items-center text-center">
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
                {auth.currentUser?.displayName?.[0] || auth.currentUser?.email?.[0] || "Y"}
             </div>
             <h2 className="text-2xl font-bold mb-1">{auth.currentUser?.displayName || "You"}</h2>
             <p className="text-sm opacity-80">30 transactions • 5 budgets • 2 recurring</p>
          </div>
      </div>

      {/* Currency - Page 13 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Currency</h3>
        <div className="flex flex-wrap gap-2">
           {currencies.map((c) => (
             <button key={c.code} className={`px-5 py-3 rounded-2xl border transition-all flex items-center gap-2 ${c.code === 'INR' ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'}`}>
                <span className="text-sm font-bold">{c.symbol} {c.code}</span>
             </button>
           ))}
        </div>
      </section>


      {/* Recurring - Page 13 */}
      <section className="space-y-4 text-gray-900">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Recurring bills</h3>
            <button 
              onClick={() => navigate('/recurring')}
              className="text-[#7c3aed] text-sm font-bold flex items-center gap-1"
            >
                <Plus size={16} /> Add
            </button>
        </div>
        <div className="bg-[#f5f3ff] rounded-3xl p-6 flex items-center justify-between cursor-pointer group" onClick={() => navigate('/recurring')}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#7c3aed]">
                    <Bell size={24} />
                </div>
                <div>
                   <h4 className="font-bold">Run subscriptions audit</h4>
                   <p className="text-xs text-gray-500">See your monthly total and spot bills you might not be using.</p>
                </div>
            </div>
            <ChevronRight size={20} className="text-[#7c3aed] group-hover:translate-x-1 transition-transform" />
        </div>
      </section>

      {/* Shared Dashboard - Page 14 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Shared dashboard</h3>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f5f3ff] rounded-full flex items-center justify-center text-[#7c3aed] border-2 border-white font-bold">
                    Y
                </div>
                <div>
                   <h4 className="font-bold text-gray-900">Share with a partner</h4>
                   <p className="text-xs text-gray-500">Add a partner to view two budgets at once.</p>
                </div>
            </div>
            <button 
              onClick={() => navigate('/shared')}
              className="px-4 py-2 bg-[#f5f3ff] text-[#7c3aed] rounded-xl text-sm font-bold"
            >
              Add
            </button>
        </div>
      </section>

      {/* Export - Page 14 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Export this month</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={downloadCSV}
              disabled={loading}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-gray-200 transition-all disabled:opacity-50"
            >
                <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-500">
                    <Download size={24} />
                </div>
                <div className="text-left">
                   <h4 className="font-bold text-gray-900 text-sm">Download CSV</h4>
                   <p className="text-[10px] text-gray-500">Spreadsheet of this month's transactions.</p>
                </div>
            </button>
            <button 
              onClick={downloadPDF}
              disabled={loading}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-gray-200 transition-all disabled:opacity-50"
            >
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <Download size={24} />
                </div>
                <div className="text-left">
                   <h4 className="font-bold text-gray-900 text-sm">Download PDF statement</h4>
                   <p className="text-[10px] text-gray-500">Branded monthly summary with totals.</p>
                </div>
            </button>
        </div>
      </section>

      {/* Data - Page 14 */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Data</h3>
        <div className="space-y-4">
            <button 
               disabled={loading}
               onClick={handleDemoData}
               className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:border-gray-200 transition-all disabled:opacity-50"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500">
                        <Plus size={24} />
                    </div>
                    <div className="text-left">
                       <h4 className="font-bold text-gray-900">Add demo transactions</h4>
                       <p className="text-xs text-gray-500">Inject a fresh batch of sample data to explore.</p>
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
            </button>
            <button 
                onClick={() => setIsResetting(true)}
                className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:border-rose-100 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-colors">
                        <RefreshCw size={24} />
                    </div>
                    <div className="text-left">
                       <h4 className="font-bold text-gray-900 font-bold group-hover:text-rose-600">Reset everything</h4>
                       <p className="text-xs text-gray-500 uppercase font-medium">Wipe data and start over with demo content.</p>
                    </div>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
            </button>
        </div>
      </section>

      <div className="text-center pt-10">
         <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-6">FinFlow Pro • v1.0 • made with care</p>
         <button 
            onClick={handleLogout}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all"
         >
            Logout
         </button>
      </div>
      <AnimatePresence>
         {(showDemoSuccess || showResetSuccess) && (
            <motion.div 
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3"
            >
               <Bell size={20} className="text-violet-400" />
               {showDemoSuccess ? "Sample data injected!" : "All data wiped clean."}
            </motion.div>
         )}
      </AnimatePresence>

      <AnimatePresence>
        {isResetting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResetting(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                   <RefreshCw size={40} className="animate-spin-slow" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight text-rose-600">Nuclear Option?</h3>
                   <p className="text-sm font-bold text-gray-400">This will wipe all transactions, budgets, goals, and recurring bills. This cannot be undone.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                   <button onClick={handleReset} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Confirm Wipeout</button>
                   <button onClick={() => setIsResetting(false)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
