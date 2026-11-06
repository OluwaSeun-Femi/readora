"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // Backup for the theme script in <head>: if an extension stopped it running, apply the saved theme now.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("readora-theme");
      if ((saved === "light" || saved === "dark") && document.documentElement.dataset.theme !== saved) {
        document.documentElement.dataset.theme = saved;
        window.dispatchEvent(new Event("readora-theme"));
      }
    } catch {
      // Storage can be blocked in private browsing; the device setting is used instead.
    }
  }, []);

  return (
    // reducedMotion="user": animations calm down for people who ask their device for less motion.
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="bottom-center"
        offset={88}
        mobileOffset={84}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-[0_12px_32px_-12px_rgb(15_20_35/0.35)] !font-sans !text-[15px]",
            description: "!text-ink-soft",
            success: "[&_[data-icon]]:!text-leaf",
            error: "[&_[data-icon]]:!text-alarm",
          },
        }}
      />
    </MotionConfig>
  );
}
