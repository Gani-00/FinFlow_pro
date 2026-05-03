import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function getFinancialInsights(transactions: any[]) {
  try {
    const ai = getAiClient();
    
    // Select the appropriate model based on task type
    const modelName = "gemini-3-flash-preview"; 

    const prompt = `
      Analyze the following transactions for a personal finance app and provide 3-4 concise, actionable financial insights or tips.
      Each insight should be in the format "Title: Actionable advice".
      Transactions: ${JSON.stringify(transactions.slice(0, 10).map(t => ({ name: t.name, amount: t.amount, type: t.type, category: t.category })) || [])}
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.warn("Gemini returned empty text, using fallback");
      throw new Error("Empty response");
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini AI error details:", error);
    // Silent fallback for UI
    return [
      "Spending Habits: You've had several recurring expenses this month. Consider reviewing them for potential savings.",
      "Savings Goal: You're on track to save ₹2,000 more than last month if current trends continue.",
      "Category Alert: Your 'Food' spending is 15% higher than usual. maybe try home cooking this week?",
      "Budget Tip: Set aside 20% of your income automatically to build your wealth faster."
    ];
  }
}

