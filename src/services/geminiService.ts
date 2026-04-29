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
    
    const prompt = `
      Analyze the following transactions for a personal finance app and provide 3-4 concise, actionable financial insights or tips.
      Transactions: ${JSON.stringify(transactions.slice(0, 10) || [])}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    if (!text) throw new Error("No response text from Gemini");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return [
      "Track your expenses daily to stay on top of your budget.",
      "Consider setting aside 20% of your income for savings.",
      "Review your recurring subscriptions to find potential savings."
    ];
  }
}

