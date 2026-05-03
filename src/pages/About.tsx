import { motion } from "motion/react";
import { Info, Shield, Zap, Heart, Layout, Wallet, CreditCard, PieChart, Target } from "lucide-react";

export default function About() {
  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-24 h-24 bg-violet-600 rounded-[32px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-violet-200"
        >
          <PieChart size={48} />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 leading-none">FinFlow Pro</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Version 1.2 • AI-Powered Finance</p>
        </div>
      </section>

      {/* About The Web Site */}
      <section className="bg-white rounded-[40px] p-8 md:p-12 shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 border-l-4 border-violet-600 pl-4">About the platform</h2>
        <p className="text-gray-600 leading-relaxed font-medium">
          FinFlow Pro is more than just an expense tracker. It's a comprehensive financial ecosystem designed to give you total control over your money. Built with the latest AI technology, it learns from your spending patterns to provide actionable insights that help you save more and spend smarter.
        </p>
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="p-6 bg-violet-50 rounded-3xl space-y-2">
             <div className="text-violet-600"><Shield size={24} /></div>
             <p className="font-bold text-gray-900">Secure</p>
             <p className="text-[10px] text-gray-500 font-medium">Your data is encrypted and protected with enterprise-grade security.</p>
          </div>
          <div className="p-6 bg-pink-50 rounded-3xl space-y-2">
             <div className="text-pink-600"><Zap size={24} /></div>
             <p className="font-bold text-gray-900">Swift</p>
             <p className="text-[10px] text-gray-500 font-medium">Real-time sync across devices ensuring you're always up to date.</p>
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="space-y-8">
        <h2 className="text-2xl font-black tracking-tight text-gray-900 px-4 transition-all hover:translate-x-1 cursor-default">How to use FinFlow</h2>
        
        <div className="space-y-4">
          {[
            { 
              title: "1. Capture Every Transaction", 
              desc: "Don't skip a single coffee. Use the '+' button to log every income and expense immediately.", 
              icon: PlusIcon,
              color: "bg-indigo-50 text-indigo-500"
            },
            { 
              title: "2. Set Realistic Budgets", 
              desc: "Allocate money to categories like Food, Shopping or Bills. We'll alert you when you're getting close to your limit.", 
              icon: PieChart,
              color: "bg-rose-50 text-rose-500"
            },
            { 
              title: "3. Listen to AI Insights", 
              desc: "Our AI brain analyzes your transactions and gives you tips on the Home screen to improve your financial health.", 
              icon: Zap,
              color: "bg-amber-50 text-amber-500"
            },
            { 
              title: "4. Track Your Long-term Goals", 
              desc: "Buying a house? A car? Or just an emergency fund? Create goals and watch your progress grow daily.", 
              icon: Target,
              color: "bg-cyan-50 text-cyan-500"
            }
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-[32px] p-6 flex flex-col md:flex-row gap-6 shadow-sm border border-gray-100 items-start md:items-center group hover:border-violet-200 transition-all"
              >
                <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm`}>
                   <Icon size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">{step.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Developer Note */}
      <section className="bg-gray-900 rounded-[40px] p-10 text-white space-y-6 overflow-hidden relative">
         <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl" />
         <div className="relative space-y-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Heart className="text-rose-500 fill-rose-500" size={24} /> 
              Made for your balance
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed font-medium">
              We started FinFlow because we were tired of complex bank apps. We wanted something beautiful, bold, and smart. We hope it helps you find your financial flow.
            </p>
         </div>
         <div className="pt-4 flex items-center gap-4 border-t border-white/10">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
               <Info size={20} className="text-gray-400" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">FinFlow Pro Ecosystem • Support Team</p>
         </div>
      </section>
    </div>
  );
}

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
