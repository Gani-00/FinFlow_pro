import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Sparkles, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: "user" | "model";
  content: string;
}

export default function Chatbot({ transactions }: { transactions: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I'm your FinFlow Coach. How can I help you with your finances today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      const genAI = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `You are FinFlow Coach, a friendly and professional financial advisor. 
      Use the following user transaction data to provide specific answers if asked. 
      User Transactions: ${JSON.stringify(transactions.slice(0, 20))}
      Keep advice concise, encouraging, and actionable. Don't give legal advice. 
      If the user asks about their spending, refer to the data provided.`;

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
      setMessages(prev => [...prev, { role: "model", content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-10 right-6 md:right-32 w-16 h-16 bg-gradient-to-br from-[#764ba2] to-[#667eea] rounded-full shadow-2xl flex items-center justify-center text-white z-40"
      >
        <MessageSquare size={28} />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500"></span>
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] md:inset-auto md:bottom-28 md:right-10 md:w-96 md:h-[600px] flex flex-col bg-white md:rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight leading-none mb-1">FinFlow Coach</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Always Online</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={i} 
                  className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-violet-600 text-white" : "bg-white text-gray-400 shadow-sm"}`}>
                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${m.role === "user" ? "bg-violet-600 text-white rounded-tr-none" : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none"}`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white p-4 rounded-3xl rounded-tl-none shadow-sm border border-gray-100">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text"
                placeholder="Ask me about your budget..."
                className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-50 transition-all outline-none"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!input.trim() || loading}
                className="w-12 h-12 bg-violet-600 text-white rounded-2xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-100"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
