import { ResolvedTheme } from "../context/ThemeContext";

export interface ChartThemeTokens {
  bgCard: string;
  gridLine: string;
  axisText: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  sliceBorder: string;
  brandLine: string;
  brandFill: string;
  accentLine: string;
  accentFill: string;
  incomeColor: string;
  expenseColor: string;
  savingsColor: string;
}

export function getChartThemeTokens(resolvedTheme: ResolvedTheme): ChartThemeTokens {
  if (resolvedTheme === "dark") {
    return {
      bgCard: "#1E293B",
      gridLine: "rgba(51, 65, 85, 0.6)", // #334155 at 60% opacity
      axisText: "#CBD5E1",
      tooltipBg: "#1E293B",
      tooltipBorder: "#334155",
      tooltipText: "#F8FAFC",
      tooltipMuted: "#94A3B8",
      sliceBorder: "#1E293B",
      brandLine: "#A78BFA",
      brandFill: "#8B5CF6",
      accentLine: "#60A5FA",
      accentFill: "#3B82F6",
      incomeColor: "#22C55E",
      expenseColor: "#F87171",
      savingsColor: "#34D399",
    };
  }

  return {
    bgCard: "#FFFFFF",
    gridLine: "#F1F5F9",
    axisText: "#64748B",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#E2E8F0",
    tooltipText: "#0F172A",
    tooltipMuted: "#64748B",
    sliceBorder: "#FFFFFF",
    brandLine: "#7C3AED",
    brandFill: "#8B5CF6",
    accentLine: "#3B82F6",
    accentFill: "#60A5FA",
    incomeColor: "#10B981",
    expenseColor: "#EF4444",
    savingsColor: "#059669",
  };
}
