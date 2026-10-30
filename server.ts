import "dotenv/config";
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Data-driven fallback generator for insights
function generateRuleBasedInsights(transactions: any[]): string[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [
      "Getting Started: Record your recent expenses and income in the Activity tab to unlock smart AI breakdowns.",
      "50/30/20 Rule: Aim to allocate 50% for necessities, 30% for lifestyle, and 20% for savings and investments.",
      "Emergency Cushion: Building a 3-6 month safety cushion is the bedrock of long-term financial resilience.",
      "Automatic Wealth: Set up recurring transfers on payday to pay yourself first before discretionary spending."
    ];
  }

  const expenses = transactions.filter((t: any) => t.type === "expense");
  const income = transactions.filter((t: any) => t.type === "income");

  const totalExpense = expenses.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const totalIncome = income.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((t: any) => {
    const cat = t.category || "General";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCategories[0];

  const results: string[] = [];

  if (topCat && totalExpense > 0) {
    const pct = Math.round((topCat[1] / totalExpense) * 100);
    const tenPctSaving = Math.round(topCat[1] * 0.1);
    results.push(
      `Primary Expense Driver: '${topCat[0]}' accounts for ${pct}% of your spending (₹${topCat[1].toLocaleString()}). Trimming 10% would save ₹${tenPctSaving.toLocaleString()} this month.`
    );
  }

  if (totalIncome > 0) {
    const savingsRate = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
    if (savingsRate >= 20) {
      results.push(`Healthy Savings Margin: You are retaining ${savingsRate}% of your incoming cash flow, outperforming standard 20% guidelines.`);
    } else if (savingsRate > 0) {
      results.push(`Savings Rate: You are currently saving ${savingsRate}% of your earnings. Target 20% by auditing non-essential subscriptions.`);
    } else {
      results.push(`Cash Flow Alert: Expenses exceed recorded income by ₹${Math.abs(totalExpense - totalIncome).toLocaleString()}. Review discretionary spending.`);
    }
  } else if (totalExpense > 0) {
    results.push(`Expense Tracking: You have logged ₹${totalExpense.toLocaleString()} in expenditures. Add your income entries to track net margin.`);
  }

  results.push("Smart Habit: Categorize your transactions promptly to identify recurring leakages early.");
  results.push("Goal Alignment: Put surplus cash into high-yield avenues or mutual funds for steady compound growth.");

  return results.slice(0, 4);
}

// Data-driven fallback generator for chat queries
function generateRuleBasedChatResponse(userQuery: string, transactions: any[]): string {
  const queryLower = (userQuery || "").toLowerCase();
  const txCount = transactions?.length || 0;

  const expenses = (transactions || []).filter((t: any) => t.type === "expense");
  const income = (transactions || []).filter((t: any) => t.type === "income");

  const totalExpense = expenses.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const totalIncome = income.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const categoryTotals: Record<string, number> = {};
  expenses.forEach((t: any) => {
    const cat = t.category || "General";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(t.amount) || 0);
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const topCat = sortedCategories[0];

  if (queryLower.includes("spend") || queryLower.includes("expense") || queryLower.includes("cost")) {
    if (totalExpense === 0) {
      return "You haven't recorded any expenses yet. Once you add transactions, I can break down your biggest spending areas!";
    }
    let reply = `Here is a breakdown of your expenditures:\n\n• Total Outflow: ₹${totalExpense.toLocaleString()} across ${expenses.length} expense transactions.\n`;
    if (topCat) {
      reply += `• Top Category: '${topCat[0]}' is your largest expense at ₹${topCat[1].toLocaleString()} (${Math.round((topCat[1] / totalExpense) * 100)}% of total).\n`;
    }
    reply += `• Quick Tip: Auditing your top category for 10% savings can generate an extra ₹${Math.round((topCat ? topCat[1] * 0.1 : 500)).toLocaleString()} in monthly cash reserve.`;
    return reply;
  }

  if (queryLower.includes("save") || queryLower.includes("saving") || queryLower.includes("invest")) {
    let reply = "Here are strategies to boost your savings based on your cash flow:\n\n";
    if (totalIncome > 0) {
      const rate = Math.round((netBalance / totalIncome) * 100);
      reply += `• Current Savings Rate: ${rate > 0 ? `${rate}%` : "0% (expenses match or exceed income)"}.\n`;
    }
    reply += `• The 50/30/20 Rule: 50% for essentials (rent, groceries, bills), 30% for discretionary wants, and 20% direct to emergency funds or index funds.\n`;
    reply += `• Automated Payday Sweep: Move 15-20% into your savings account the day your income lands.`;
    return reply;
  }

  if (queryLower.includes("budget") || queryLower.includes("limit") || queryLower.includes("plan")) {
    return `To build a realistic budget in FinFlow:\n\n1. Check your Planning tab to set monthly limits by category.\n2. Keep your fixed commitments (bills and rent) below 50% of your net income.\n3. Keep a ₹${Math.round(Math.max(totalExpense * 0.2, 2000)).toLocaleString()} buffer for unexpected or seasonal expenses.`;
  }

  // General helpful response
  let general = `Hello! Based on your active portfolio:\n\n`;
  if (txCount > 0) {
    general += `• Net Cash Flow: ₹${netBalance.toLocaleString()} (Income: ₹${totalIncome.toLocaleString()} | Expenses: ₹${totalExpense.toLocaleString()})\n`;
    if (topCat) {
      general += `• Key Spending Area: ${topCat[0]} (₹${topCat[1].toLocaleString()})\n`;
    }
    general += `• Active Records: ${txCount} transactions logged.\n\n`;
    general += `How can I help you today? You can ask about your spending habits, budgeting tips, or saving goals!`;
  } else {
    general += `• You have not added any transactions yet. Head over to the Activity tab to record your first income or expense!\n\n`;
    general += `I'm here to answer any questions about budgeting, the 50/30/20 rule, emergency funds, or debt reduction.`;
  }
  return general;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "FinFlow Pro API is running" });
  });

  // Server-Side Gemini API: Financial Insights
  app.post("/api/gemini/insights", async (req, res) => {
    const transactions = req.body?.transactions || [];
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        insights: generateRuleBasedInsights(transactions),
        source: "local",
      });
    }

    try {
      const prompt = `Analyze the following transactions for a personal finance app and provide 3-4 concise, actionable financial insights or tips.
Each insight should strictly follow the format "Title: Actionable advice".
Transactions: ${JSON.stringify(transactions.slice(0, 20).map((t: any) => ({ name: t.name, amount: t.amount, type: t.type, category: t.category })))}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ insights: parsed, source: "gemini" });
        }
      }
      return res.json({ insights: generateRuleBasedInsights(transactions), source: "local" });
    } catch (error: any) {
      console.warn("Gemini insights notice:", error?.message || "Using smart fallback");
      return res.json({
        insights: generateRuleBasedInsights(transactions),
        source: "fallback",
      });
    }
  });

  // Server-Side Gemini API: Financial Coach Chat
  app.post("/api/gemini/chat", async (req, res) => {
    const { messages = [], transactions = [] } = req.body;
    const userMsg = messages[messages.length - 1]?.content || "";
    const ai = getGeminiClient();

    if (!ai) {
      const fallbackReply = generateRuleBasedChatResponse(userMsg, transactions);
      return res.json({ reply: fallbackReply, source: "local" });
    }

    try {
      const historyParts = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.content || "" }],
      }));

      const systemInstruction = `You are FinFlow Coach, a world-class financial advisor.
You help users manage expenses, set budgets, and achieve financial freedom.
User's Recent Transactions: ${JSON.stringify(transactions.slice(0, 25))}
Respond in a professional, encouraging tone. Be concise, actionable, and prioritize data-driven tips. If giving advice, use bullet points.`;

      const contents = [
        ...historyParts,
        { role: "user" as const, parts: [{ text: userMsg }] },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text?.trim() || "I have reviewed your financial details.";
      return res.json({ reply, source: "gemini" });
    } catch (error: any) {
      console.warn("Gemini chat notice:", error?.message || "Using smart fallback");
      const fallbackReply = generateRuleBasedChatResponse(userMsg, transactions);
      return res.json({ reply: fallbackReply, source: "fallback" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
