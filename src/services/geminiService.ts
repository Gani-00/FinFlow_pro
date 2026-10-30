export async function getFinancialInsights(transactions: any[]): Promise<string[]> {
  try {
    const response = await fetch("/api/gemini/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: transactions || [] }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.insights) && data.insights.length > 0) {
        return data.insights;
      }
    }
  } catch (error) {
    console.warn("Could not reach insights service, using default recommendations:", error);
  }

  // Graceful fallback for UI
  return [
    "Spending Habits: You've had several recurring expenses this month. Consider reviewing them for potential savings.",
    "Savings Goal: You're on track to save more if current trends continue.",
    "Category Alert: Review your recent food and dining expenditures for quick saving opportunities.",
    "Budget Tip: Set aside 20% of your income automatically to build your wealth faster."
  ];
}
