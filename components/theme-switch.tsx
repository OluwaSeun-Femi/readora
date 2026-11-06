"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

type Mode = "light" | "dark";

const KEY = "readora-theme";
const EVENT = "readora-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Light or dark as it is right now: the reader's choice, or the device setting until they choose. */
function readMode(): Mode {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

export function useMode() {
  return useSyncExternalStore(subscribe, readMode, () => "light" as Mode);
}

function setMode(mode: Mode) {
  const root = document.documentElement;
  // Let colours ease across for a moment, then switch transitions back off.
  root.classList.add("theme-changing");
  window.setTimeout(() => root.classList.remove("theme-changing"), 320);
  root.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Private browsing can block storage; the choice still applies to this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * One button: tap to switch between light and dark. The icon shows what you'll switch to
 * (a moon in light mode, a sun in dark mode) and spins across when it changes.
 */
export function ThemeToggle({ label = false, className = "" }: { label?: boolean; className?: string }) {
  const mode = useMode();
  const next: Mode = mode === "dark" ? "light" : "dark";
  const Icon = next === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={
        label
          ? `flex h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-ink-soft transition-colors hover:bg-sunken hover:text-ink ${className}`
          : `inline-flex size-10 items-center justify-center rounded-[10px] text-ink-soft transition-colors hover:bg-sunken hover:text-ink ${className}`
      }
    >
      <span className="relative inline-flex size-[18px] items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={next}
            initial={{ rotate: -120, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 120, scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", damping: 16, stiffness: 260 }}
            className="absolute inline-flex"
          >
            <Icon className="size-[18px]" aria-hidden />
          </motion.span>
        </AnimatePresence>
      </span>
      {label && <span>{next === "dark" ? "Dark mode" : "Light mode"}</span>}
    </button>
  );
}
