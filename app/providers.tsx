"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
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
