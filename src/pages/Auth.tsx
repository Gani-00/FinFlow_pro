import { useState } from "react";
import { motion } from "motion/react";
import { Wallet, Mail, Lock, User, ArrowRight, Chrome } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists, if not create it
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "Unknown User",
          email: user.email,
          createdAt: serverTimestamp(),
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Sign-in method not enabled. Please enable Google in Firebase Console.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Login popup was blocked. Please allow popups for this site.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = result.user;
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          email: user.email,
          createdAt: serverTimestamp(),
        });
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in not enabled in Firebase Console.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
            <Wallet className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">FinFlow Pro</h1>
          <p className="text-sm text-[#64748b] mt-1 font-medium">Smart finance for modern people.</p>
        </div>

        <motion.div 
          layout
          className="bg-white p-8 rounded-xl border border-[#e2e8f0] shadow-xl shadow-black/5"
        >
          <div className="flex bg-[#f8fafc] p-1 rounded-lg mb-6 border border-[#e2e8f0]">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isLogin ? 'bg-white shadow-sm text-[#0f172a] border border-[#e2e8f0]' : 'text-[#94a3b8]'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isLogin ? 'bg-white shadow-sm text-[#0f172a] border border-[#e2e8f0]' : 'text-[#94a3b8]'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-rose-50 text-danger p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-rose-100 italic">
                {error}
              </div>
            )}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider px-1">Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    required
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider px-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input 
                  type="email" 
                  placeholder="john@example.com"
                  required
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider px-1">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full group bg-[#0f172a] text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-all mt-4 disabled:opacity-50 text-sm"
            >
              <span>{loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#f1f5f9]"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-white px-3 text-[#94a3b8]">or</span></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-[#e2e8f0] text-[#0f172a] py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#f8fafc] transition-all shadow-sm disabled:opacity-50 text-sm"
          >
            <Chrome size={16} className="text-rose-500" />
            <span>Google Workspace</span>
          </button>

          {isLogin && (
            <p className="text-center text-xs text-[#64748b] mt-6 cursor-pointer hover:text-[#0f172a] font-medium">
              Forgot password?
            </p>
          )}
        </motion.div>
        
        <div className="mt-8 text-center px-6">
            <p className="text-[10px] text-[#94a3b8] leading-relaxed uppercase tracking-wider font-bold">
                Secured by military-grade encryption. Your data is always private.
            </p>
        </div>
      </div>
    </div>
  );
}
