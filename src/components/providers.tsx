"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ConfirmProvider } from "./ui/modal";
import { ToastProvider } from "./ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
