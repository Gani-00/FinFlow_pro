import { motion, AnimatePresence } from "motion/react";
import { Users, Plus, Mail, ArrowRight, Check, X, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

type Partner = {
  id: string;
  email: string;
  status: "pending" | "accepted";
  senderId: string;
  receiverId?: string;
  name?: string;
};

export default function SharedDashboard() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for invitations sent or received
    const q1 = query(collection(db, "partners"), where("senderId", "==", auth.currentUser.uid));
    const q2 = query(collection(db, "partners"), where("email", "==", auth.currentUser.email));

    const unsub1 = onSnapshot(q1, (snap) => {
       const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
       setPartners(prev => {
          const received = prev.filter(p => p.email === auth.currentUser?.email);
          return [...list, ...received];
       });
       setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
       const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
       setPartners(prev => {
          const sent = prev.filter(p => p.senderId === auth.currentUser?.uid);
          return [...sent, ...list];
       });
       setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !inviteEmail) return;
    if (inviteEmail === auth.currentUser.email) {
       setMsg("You cannot invite yourself!");
       return;
    }

    try {
      await addDoc(collection(db, "partners"), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0],
        email: inviteEmail.toLowerCase(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      setInviteEmail("");
      setMsg("Invitation sent!");
      setTimeout(() => setMsg(""), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "partners");
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await updateDoc(doc(db, "partners", id), {
        status: "accepted",
        receiverId: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `partners/${id}`);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const removePartner = async (id: string) => {
     try {
       await deleteDoc(doc(db, "partners", id));
       setIsDeleting(null);
     } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);
     }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Collaboration</h2>
        <h1 className="text-3xl font-extrabold tracking-tighter text-gray-900 leading-none">Shared Access</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-[40px] p-8 space-y-6 shadow-sm">
           <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
              <Mail size={24} />
           </div>
           <div className="space-y-1">
              <h3 className="text-xl font-black tracking-tighter text-gray-900">Invite Partner</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Share management power</p>
           </div>
           
           <form onSubmit={handleInvite} className="space-y-4">
              <div className="relative">
                <input 
                   type="email" required placeholder="partner@email.com"
                   className="w-full bg-gray-50 border-none rounded-2xl py-5 pl-12 pr-4 text-sm font-bold focus:ring-4 focus:ring-violet-50 outline-none transition-all placeholder:text-gray-300"
                   value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                />
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button 
                type="submit"
                className="w-full bg-gray-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-100"
              >
                 <span>Send invitation</span>
                 <ArrowRight size={16} />
              </button>
              {msg && <p className="text-center text-xs font-bold text-violet-600 animate-pulse">{msg}</p>}
           </form>
        </div>

        <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm">
           <h3 className="text-xl font-black mb-6 tracking-tighter">Account Status</h3>
           <div className="space-y-3">
              {partners.length === 0 && !loading && (
                 <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-[32px]">
                    <Users size={32} className="mx-auto text-gray-100 mb-2" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No connections yet</p>
                 </div>
              )}
              {partners.map((p) => {
                 const isReceived = p.email === auth.currentUser?.email;
                 return (
                   <motion.div layout key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group transition-all">
                       <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 ${p.status === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} rounded-xl flex items-center justify-center font-black text-xs`}>
                               {p.email.charAt(0).toUpperCase()}
                           </div>
                           <div className="overflow-hidden">
                               <p className="font-black text-gray-900 text-xs truncate max-w-[120px]">{p.email}</p>
                               <p className={`text-[9px] font-bold uppercase tracking-widest ${p.status === 'accepted' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {p.status} {isReceived && p.status === 'pending' && '• Action Required'}
                                </p>
                           </div>
                       </div>
                       <div className="flex items-center gap-2">
                           {isReceived && p.status === 'pending' && (
                              <button onClick={() => handleAccept(p.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                                 <Check size={16} />
                              </button>
                           )}
                           <button onClick={() => setIsDeleting(p.id)} className="p-2 text-gray-300 hover:text-rose-500 rounded-lg transition-colors">
                               <X size={16} />
                           </button>
                       </div>
                   </motion.div>
                 );
              })}
           </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-10 rounded-[44px] relative overflow-hidden group shadow-2xl shadow-violet-100">
         <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20 backdrop-blur-xl">
               <Shield size={32} />
            </div>
            <div className="space-y-4 max-w-sm">
               <h2 className="text-4xl font-black tracking-tighter leading-[0.9]">Collaborative Spending.</h2>
               <p className="text-white/60 text-sm font-bold uppercase tracking-wider leading-relaxed">
                  Compare spending patterns and manage joint budgets in real-time.
               </p>
            </div>
         </div>
         <Users className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64 group-hover:scale-110 transition-transform duration-700" />
      </div>

      <AnimatePresence>
        {isDeleting && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 text-gray-900">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleting(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[44px] shadow-2xl p-10 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                   <Users size={40} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl font-black tracking-tight">Revoke Access?</h3>
                   <p className="text-sm font-bold text-gray-400">This will immediately disconnect the partner and stop shared view.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setIsDeleting(null)} className="bg-gray-50 text-gray-400 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all">Cancel</button>
                   <button onClick={() => removePartner(isDeleting)} className="bg-rose-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 transition-all">Remove</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
