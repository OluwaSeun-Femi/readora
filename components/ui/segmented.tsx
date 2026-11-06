"use client";

import { useId } from "react";
import { motion } from "motion/react";

type Option<T extends string> = { value: T; label: string; count?: number };

/** A row of filter buttons with a pill that slides to the chosen one. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
}) {
  const pillId = useId();
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-sunken p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-medium transition-colors ${
              active ? "text-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_2px_rgb(15_20_35/0.12),0_0_0_1px_var(--color-line)]"
                transition={{ type: "spring", damping: 30, stiffness: 420 }}
              />
            )}
            <span className="relative">{option.label}</span>
            {option.count !== undefined && (
              <span className={`relative tabular-nums ${active ? "text-ink-soft" : "text-ink-faint"}`}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
