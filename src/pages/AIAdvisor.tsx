import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, ChevronLeft, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function AIAdvisor() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('finflow_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: "model", content: "Hello! I'm your FinFlow Coach. I've analyzed your recent transactions. How can I help you optimize your wealth today?" }
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('finflow_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!auth.currentUser) return;
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      setTransactions(snapshot.docs.map(doc => doc.data()));
    };
    fetchTransactions();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiKey = process.env.AIzaSyDYadCQxs_sePaKDd8nOz8hoh_kDZdCdIw;
      if (!apiKey) throw new Error("API Key missing");
      
      const genAI = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `You are FinFlow Coach, a world-class financial advisor. 
      You help users manage expenses, set budgets, and achieve financial freedom.
      Current User Data (Recent Transactions): ${JSON.stringify(transactions.slice(0, 30))}
      Respond in a professional yet encouraging tone. Be concise. 
      If providing insights, use bullet points. 
      Always prioritize data-driven advice based on the provided transactions.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })), 
          { role: "user" as const, parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      });

      const responseText = result.text || "I'm sorry, I couldn't process that.";
      setMessages(prev => [...prev, { role: "model", content: responseText }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "model", content: "I'm having trouble thinking right now. Please check your network and try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const initial = [{ role: "model" as const, content: "Chat cleared. How can I assist you now?" }];
    setMessages(initial);
    localStorage.removeItem('finflow_chat_history');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-violet-600" size={20} />
              AI Coach
            </h1>
            <p className="text-[10px] font-bold text-gray-400 border-l border-gray-200 pl-2 uppercase tracking-widest">Active Intelligence</p>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          title="Clear History"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
        {messages.map((m, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${m.role === "user" ? "bg-violet-600 text-white" : "bg-white text-violet-600 border border-violet-100"}`}>
              {m.role === "user" ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div className={`max-w-[85%] md:max-w-[70%] p-5 rounded-[32px] text-sm font-medium leading-relaxed shadow-sm ${
              m.role === "user" 
                ? "bg-violet-600 text-white rounded-tr-none" 
                : "bg-white text-gray-800 border border-gray-100 rounded-tl-none whitespace-pre-wrap"
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-white border border-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-sm">
              <Bot size={20} />
            </div>
            <div className="bg-white p-5 rounded-[32px] rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-gray-100">
        <form onSubmit={handleSend} className="flex gap-4">
          <input 
            type="text"
            placeholder="Ask about your spending, saving tips, or future goals..."
            className="flex-1 bg-gray-50 border-2 border-transparent rounded-[24px] px-6 py-4 text-sm font-bold focus:border-violet-100 focus:bg-white focus:ring-4 focus:ring-violet-50 transition-all outline-none"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="w-14 h-14 bg-violet-600 text-white rounded-[20px] flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 transition-all shadow-xl shadow-violet-100 active:scale-95"
          >
            <Send size={24} />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-4 font-bold uppercase tracking-widest opacity-60">FinFlow Coach powered by AI • Real-time Financial Analysis</p>
      </div>
    </div>
  );
}
