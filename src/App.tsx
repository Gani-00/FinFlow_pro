/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import Dashboard from "./pages/Dashboard";
import Activity from "./pages/Transactions";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AuthPage from "./pages/Auth";
import Recurring from "./pages/Recurring";
import SharedDashboard from "./pages/SharedDashboard";
import About from "./pages/About";
import AIAdvisor from "./pages/AIAdvisor";
import Planning from "./pages/Planning";
import Layout from "./components/Layout";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center font-sans bg-[#f1f5f9]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Initializing FinFlow...</div>
    </div>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!isAuthenticated ? <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} /> : <Navigate to="/" />} />
        
        <Route element={isAuthenticated ? <Layout onLogout={handleLogout} /> : <Navigate to="/auth" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/shared" element={<SharedDashboard />} />
          <Route path="/about" element={<About />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
        </Route>
      </Routes>
    </Router>
  );
}
