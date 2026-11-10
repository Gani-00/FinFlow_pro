import React from "react";
import { Check } from "lucide-react";
import { CATEGORY_LIST, CategoryMeta, getCategoryMeta } from "./categoryMeta";
import { useTheme } from "../../context/ThemeContext";

interface CategoryGridPickerProps {
  value: string;
  onChange: (categoryLabel: string) => void;
  className?: string;
}

export const CategoryGridPicker: React.FC<CategoryGridPickerProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Resolve current active category
  const activeMeta = getCategoryMeta(value);

  return (
    <div
      role="radiogroup"
      aria-label="Select transaction category"
      className={`grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full ${className}`}
    >
      {CATEGORY_LIST.map((item: CategoryMeta) => {
        const isSelected = activeMeta.id === item.id;
        const IconComponent = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(item.label)}
            className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-150 cursor-pointer min-h-[68px] sm:min-h-[72px] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 active:scale-95 border ${
              isSelected
                ? "bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 dark:border-violet-400 shadow-xs"
                : "bg-gray-50/70 dark:bg-slate-800/60 border-gray-100/80 dark:border-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300"
            }`}
          >
            {/* Selected Checkmark Badge */}
            {isSelected && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-600 dark:bg-violet-500 text-white flex items-center justify-center shadow-xs">
                <Check size={10} strokeWidth={3} />
              </span>
            )}

            {/* Category Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-transform"
              style={{
                backgroundColor: isDark ? item.bgDark : item.bgLight,
                color: isDark ? item.textDark : item.textLight,
              }}
            >
              <IconComponent size={18} strokeWidth={1.8} aria-hidden="true" />
            </div>

            {/* Category Label */}
            <span
              className={`text-[11px] sm:text-xs font-bold leading-tight text-center tracking-tight truncate w-full px-1 ${
                isSelected
                  ? "text-violet-700 dark:text-violet-300 font-extrabold"
                  : "text-gray-700 dark:text-slate-300"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
