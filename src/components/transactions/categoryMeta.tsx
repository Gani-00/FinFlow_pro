import React from "react";
import {
  Utensils,
  ShoppingBag,
  Car,
  House,
  HeartPulse,
  GraduationCap,
  Film,
  PiggyBank,
  Wallet,
  Receipt,
  Fuel,
  Grid2x2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export type CanonicalCategoryId =
  | "food"
  | "shopping"
  | "travel"
  | "home"
  | "healthcare"
  | "education"
  | "entertainment"
  | "savings"
  | "salary"
  | "bills"
  | "fuel"
  | "others";

export interface CategoryMeta {
  id: CanonicalCategoryId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false"; style?: React.CSSProperties }>;
  color: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  chartColor: string;
  // Gradient helpers for charts/cards
  gradientStart: string;
  gradientEnd: string;
}

export const CATEGORY_DEFINITIONS: Record<CanonicalCategoryId, CategoryMeta> = {
  food: {
    id: "food",
    label: "Food",
    icon: Utensils,
    color: "#F59E0B",
    bgLight: "#FEF3C7", // amber-100
    bgDark: "rgba(245, 158, 11, 0.16)",
    textLight: "#B45309", // amber-700
    textDark: "#FBBF24", // amber-400
    chartColor: "#F59E0B",
    gradientStart: "#FBBF24",
    gradientEnd: "#D97706",
  },
  shopping: {
    id: "shopping",
    label: "Shopping",
    icon: ShoppingBag,
    color: "#8B5CF6",
    bgLight: "#EDE9FE", // violet-100
    bgDark: "rgba(139, 92, 246, 0.16)",
    textLight: "#6D28D9", // violet-700
    textDark: "#A78BFA", // violet-400
    chartColor: "#8B5CF6",
    gradientStart: "#A78BFA",
    gradientEnd: "#7C3AED",
  },
  travel: {
    id: "travel",
    label: "Travel",
    icon: Car,
    color: "#0284C7",
    bgLight: "#E0F2FE", // sky-100
    bgDark: "rgba(2, 132, 199, 0.16)",
    textLight: "#0369A1", // sky-700
    textDark: "#38BDF8", // sky-400
    chartColor: "#0284C7",
    gradientStart: "#38BDF8",
    gradientEnd: "#0284C7",
  },
  home: {
    id: "home",
    label: "Home",
    icon: House,
    color: "#0D9488",
    bgLight: "#CCFBF1", // teal-100
    bgDark: "rgba(13, 148, 136, 0.16)",
    textLight: "#0F766E", // teal-700
    textDark: "#2DD4BF", // teal-400
    chartColor: "#0D9488",
    gradientStart: "#2DD4BF",
    gradientEnd: "#0D9488",
  },
  healthcare: {
    id: "healthcare",
    label: "Healthcare",
    icon: HeartPulse,
    color: "#EC4899",
    bgLight: "#FCE7F3", // pink-100
    bgDark: "rgba(236, 72, 153, 0.16)",
    textLight: "#BE185D", // pink-700
    textDark: "#F472B6", // pink-400
    chartColor: "#EC4899",
    gradientStart: "#F472B6",
    gradientEnd: "#DB2777",
  },
  education: {
    id: "education",
    label: "Education",
    icon: GraduationCap,
    color: "#6366F1",
    bgLight: "#E0E7FF", // indigo-100
    bgDark: "rgba(99, 102, 241, 0.16)",
    textLight: "#4338CA", // indigo-700
    textDark: "#818CF8", // indigo-400
    chartColor: "#6366F1",
    gradientStart: "#818CF8",
    gradientEnd: "#4F46E5",
  },
  entertainment: {
    id: "entertainment",
    label: "Entertainment",
    icon: Film,
    color: "#EA580C",
    bgLight: "#FFEDD5", // orange-100
    bgDark: "rgba(234, 88, 12, 0.16)",
    textLight: "#C2410C", // orange-700
    textDark: "#FB923C", // orange-400
    chartColor: "#EA580C",
    gradientStart: "#FB923C",
    gradientEnd: "#EA580C",
  },
  savings: {
    id: "savings",
    label: "Savings",
    icon: PiggyBank,
    color: "#10B981",
    bgLight: "#D1FAE5", // emerald-100
    bgDark: "rgba(16, 185, 129, 0.16)",
    textLight: "#047857", // emerald-700
    textDark: "#34D399", // emerald-400
    chartColor: "#10B981",
    gradientStart: "#34D399",
    gradientEnd: "#059669",
  },
  salary: {
    id: "salary",
    label: "Salary",
    icon: Wallet,
    color: "#2563EB",
    bgLight: "#DBEAFE", // blue-100
    bgDark: "rgba(37, 99, 235, 0.16)",
    textLight: "#1D4ED8", // blue-700
    textDark: "#60A5FA", // blue-400
    chartColor: "#2563EB",
    gradientStart: "#60A5FA",
    gradientEnd: "#1D4ED8",
  },
  bills: {
    id: "bills",
    label: "Bills",
    icon: Receipt,
    color: "#475569",
    bgLight: "#F1F5F9", // slate-100
    bgDark: "rgba(71, 85, 105, 0.20)",
    textLight: "#334155", // slate-700
    textDark: "#94A3B8", // slate-400
    chartColor: "#475569",
    gradientStart: "#94A3B8",
    gradientEnd: "#334155",
  },
  fuel: {
    id: "fuel",
    label: "Fuel",
    icon: Fuel,
    color: "#D97706",
    bgLight: "#FEF3C7", // amber-100
    bgDark: "rgba(217, 119, 6, 0.16)",
    textLight: "#B45309", // amber-700
    textDark: "#FBBF24", // amber-400
    chartColor: "#D97706",
    gradientStart: "#FBBF24",
    gradientEnd: "#B45309",
  },
  others: {
    id: "others",
    label: "Others",
    icon: Grid2x2,
    color: "#64748B",
    bgLight: "#F1F5F9", // slate-100
    bgDark: "rgba(100, 116, 139, 0.20)",
    textLight: "#475569", // slate-600
    textDark: "#94A3B8", // slate-400
    chartColor: "#64748B",
    gradientStart: "#94A3B8",
    gradientEnd: "#475569",
  },
};

/**
 * The canonical 12 categories in the exact order requested
 * (matching the 3x4 grid in user's design reference).
 */
export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORY_DEFINITIONS.food,
  CATEGORY_DEFINITIONS.shopping,
  CATEGORY_DEFINITIONS.travel,
  CATEGORY_DEFINITIONS.home,
  CATEGORY_DEFINITIONS.healthcare,
  CATEGORY_DEFINITIONS.education,
  CATEGORY_DEFINITIONS.entertainment,
  CATEGORY_DEFINITIONS.savings,
  CATEGORY_DEFINITIONS.salary,
  CATEGORY_DEFINITIONS.bills,
  CATEGORY_DEFINITIONS.fuel,
  CATEGORY_DEFINITIONS.others,
];

/**
 * Normalized alias dictionary for robust matching against real/dirty Firestore data.
 */
const ALIAS_MAP: Record<string, CanonicalCategoryId> = {
  // Food
  food: "food",
  dining: "food",
  groceries: "food",
  grocery: "food",
  provisions: "food",
  restaurant: "food",
  cafe: "food",
  food_and_dining: "food",
  "food & dining": "food",
  
  // Shopping
  shopping: "shopping",
  store: "shopping",
  ecommerce: "shopping",
  clothes: "shopping",
  clothing: "shopping",
  electronics: "shopping",
  retail: "shopping",

  // Travel
  travel: "travel",
  transport: "travel",
  transportation: "travel",
  transit: "travel",
  cab: "travel",
  flight: "travel",
  train: "travel",
  commute: "travel",

  // Home
  home: "home",
  housing: "home",
  rent: "home",
  maintenance: "home",
  house: "home",
  gas: "home", // user's previous screenshot had GAS under Home
  lpg: "home",

  // Healthcare
  healthcare: "healthcare",
  health: "healthcare",
  medical: "healthcare",
  doctor: "healthcare",
  medicine: "healthcare",
  pharmacy: "healthcare",
  hospital: "healthcare",

  // Education
  education: "education",
  school: "education",
  college: "education",
  tuition: "education",
  course: "education",
  books: "education",

  // Entertainment
  entertainment: "entertainment",
  movies: "entertainment",
  movie: "entertainment",
  film: "entertainment",
  streaming: "entertainment",
  ott: "entertainment",
  gaming: "entertainment",
  leisure: "entertainment",

  // Savings
  savings: "savings",
  saving: "savings",
  "savings & goals": "savings",
  "savings & goal": "savings",
  goals: "savings",
  goal: "savings",
  investment: "savings",
  investments: "savings",
  chitti: "savings", // Chitti chit-fund savings

  // Salary & Income
  salary: "salary",
  income: "salary",
  "salary & income": "salary",
  "salary / income": "salary",
  earnings: "salary",
  paycheck: "salary",
  wage: "salary",
  bonus: "salary",

  // Bills
  bills: "bills",
  bill: "bills",
  utilities: "bills",
  utility: "bills",
  electricity: "bills",
  water: "bills",
  wifi: "bills",
  internet: "bills",
  recharge: "bills",
  subscription: "bills",
  subscriptions: "bills",

  // Fuel
  fuel: "fuel",
  petrol: "fuel",
  diesel: "fuel",
  cng: "fuel",

  // Others
  other: "others",
  others: "others",
  misc: "others",
  miscellaneous: "others",
  general: "others",
  uncategorized: "others",
};

/**
 * Returns canonical CategoryMeta for any raw category string.
 * Strictly uses category string (never guesses from title).
 * If unknown, falls back to Others metadata while preserving the raw label if requested.
 */
export function getCategoryMeta(rawCategory: string | null | undefined): CategoryMeta {
  if (!rawCategory || typeof rawCategory !== "string") {
    return CATEGORY_DEFINITIONS.others;
  }

  const clean = rawCategory.trim();
  const normalizedKey = clean.toLowerCase();

  // 1. Direct match in alias map
  if (ALIAS_MAP[normalizedKey]) {
    return CATEGORY_DEFINITIONS[ALIAS_MAP[normalizedKey]];
  }

  // 2. Normalized punctuation / snake_case check
  const simplified = normalizedKey.replace(/[-_&/]/g, " ").replace(/\s+/g, " ").trim();
  if (ALIAS_MAP[simplified]) {
    return CATEGORY_DEFINITIONS[ALIAS_MAP[simplified]];
  }

  // 3. Fallback: return others definition
  return CATEGORY_DEFINITIONS.others;
}

/**
 * Formats display name for a category: returns canonical label for known categories,
 * or the formatted original string if it was custom/unknown.
 */
export function getDisplayCategoryLabel(rawCategory: string | null | undefined): string {
  if (!rawCategory || !rawCategory.trim()) return "Others";
  const clean = rawCategory.trim();
  const normalizedKey = clean.toLowerCase();
  
  if (ALIAS_MAP[normalizedKey]) {
    return CATEGORY_DEFINITIONS[ALIAS_MAP[normalizedKey]].label;
  }
  
  // Capitalize custom string so it displays cleanly
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export interface CategoryIconProps {
  category: string | null | undefined;
  size?: "sm" | "md" | "lg" | number;
  className?: string;
  showBackground?: boolean;
  strokeWidth?: number;
  ariaLabel?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = "md",
  className = "",
  showBackground = true,
  strokeWidth = 1.75,
  ariaLabel,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const meta = getCategoryMeta(category);
  const IconComponent = meta.icon;

  let containerDimension = 40;
  let iconDimension = 20;
  let roundedClass = "rounded-xl";

  if (typeof size === "number") {
    containerDimension = size;
    iconDimension = Math.round(size * 0.5);
    roundedClass = size >= 44 ? "rounded-2xl" : size >= 36 ? "rounded-xl" : "rounded-lg";
  } else if (size === "sm") {
    containerDimension = 32;
    iconDimension = 16;
    roundedClass = "rounded-lg";
  } else if (size === "lg") {
    containerDimension = 48;
    iconDimension = 24;
    roundedClass = "rounded-2xl";
  } else {
    // "md" default
    containerDimension = 40;
    iconDimension = 20;
    roundedClass = "rounded-xl";
  }

  if (!showBackground) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ color: isDark ? meta.textDark : meta.textLight }}
        aria-hidden={ariaLabel ? undefined : "true"}
        aria-label={ariaLabel}
      >
        <IconComponent size={iconDimension} strokeWidth={strokeWidth} />
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 transition-colors shadow-xs ${roundedClass} ${className}`}
      style={{
        width: `${containerDimension}px`,
        height: `${containerDimension}px`,
        minWidth: `${containerDimension}px`,
        minHeight: `${containerDimension}px`,
        backgroundColor: isDark ? meta.bgDark : meta.bgLight,
        color: isDark ? meta.textDark : meta.textLight,
      }}
      aria-hidden={ariaLabel ? undefined : "true"}
      aria-label={ariaLabel}
    >
      <IconComponent size={iconDimension} strokeWidth={strokeWidth} />
    </div>
  );
};
