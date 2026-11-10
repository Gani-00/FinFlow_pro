import React from "react";
import {
  getCategoryMeta as getCanonicalMeta,
  getDisplayCategoryLabel,
  CATEGORY_LIST,
  CategoryMeta as CanonicalCategoryMeta,
} from "../transactions/categoryMeta";

export interface CategoryMeta {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  color: string;
  gradientStart: string;
  gradientEnd: string;
}

// Master color palette consistent across all charts and exports
export const CATEGORY_PALETTE = CATEGORY_LIST.map((c) => ({
  color: c.chartColor,
  start: c.gradientStart,
  end: c.gradientEnd,
}));

/**
 * Returns consistent metadata (icon, colors, name) for any category string.
 */
export function getCategoryMeta(categoryName: string, _fallbackIndex = 0): CategoryMeta {
  const meta = getCanonicalMeta(categoryName);
  const displayName = getDisplayCategoryLabel(categoryName);

  return {
    id: meta.id,
    name: displayName,
    icon: meta.icon,
    color: meta.chartColor,
    gradientStart: meta.gradientStart,
    gradientEnd: meta.gradientEnd,
  };
}
