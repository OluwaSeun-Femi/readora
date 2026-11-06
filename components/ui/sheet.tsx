"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on tablet and desktop widths. */
function useIsWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false);
}

const noop = () => () => {};

/** False during server rendering, true in the browser (portals need document.body). */
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** "panel" slides in from the right on wide screens; "dialog" stays centred. */
  variant?: "panel" | "dialog";
};

/**
 * A bottom sheet on phones and a side panel (or centred dialog) on wider screens.
 * Escape closes it, focus moves inside and returns to the button that opened it.
 */
export function Sheet({ open, onClose, title, description, children, variant = "panel" }: SheetProps) {
  const wide = useIsWide();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => {
      const target =
        panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        panelRef.current?.querySelector<HTMLElement>("input, select, textarea") ??
        panelRef.current;
      target?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const asPanel = wide && variant === "panel";
  const asDialog = wide && variant === "dialog";

  const motionProps = asPanel
    ? { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } }
    : asDialog
      ? { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 4 } }
      : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  const placement = asPanel
    ? "right-0 top-0 h-full w-full max-w-[460px] rounded-l-[22px]"
    : asDialog
      ? "left-1/2 top-1/2 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[22px]"
      : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[22px]";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-[#0b1020]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`absolute flex flex-col overflow-hidden border border-line bg-surface shadow-[0_24px_64px_-16px_rgb(10_14_30/0.45)] focus:outline-none ${placement}`}
            {...motionProps}
            transition={{ type: "spring", damping: 34, stiffness: 360, mass: 0.9 }}
          >
            {!wide && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden />}
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-4 md:px-6 md:pt-6">
              <div>
                <h2 id={titleId} className="font-serif text-[22px] font-semibold leading-tight tracking-[-0.01em]">
                  {title}
                </h2>
                {description && <p className="mt-1 text-[15px] text-ink-soft">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-safe pt-2 md:px-6 md:pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
