"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconAlert, IconX } from "./icons";
import { InkButton } from "./ink-button";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function subscribeMedia(cb: () => void) {
  const mq = window.matchMedia("(max-width: 639px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useIsMobile() {
  return useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia("(max-width: 639px)").matches,
    () => false,
  );
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** 배경 클릭·ESC로 닫기 허용 */
  dismissible?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
}

/**
 * 디자인된 모달. 휴대폰에서는 아래에서 올라오는 시트가 되고, 아래로 끌어내려 닫을 수 있다.
 */
export function Modal({ open, onClose, title, description, children, footer, dismissible = true, size = "sm", icon }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();
  const dragControls = useDragControls();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panel)?.focus();
    }, 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, dismissible, onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (dismissible && (info.offset.y > 110 || info.velocity.y > 600)) onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6 print:hidden">
          <motion.div
            className="absolute inset-0 bg-[#2a2622]/35 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => dismissible && onClose()}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            drag={isMobile && dismissible ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={onDragEnd}
            className={cn(
              "deckle relative w-full rounded-t-[28px] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[26px] sm:px-7 sm:pt-7 sm:pb-6",
              size === "sm" && "sm:max-w-md",
              size === "md" && "sm:max-w-lg",
              size === "lg" && "sm:max-w-2xl",
              "max-h-[92dvh] overflow-y-auto",
            )}
          >
            {isMobile && (
              <div
                className="-mx-5 mb-2 flex cursor-grab touch-none justify-center py-2 active:cursor-grabbing"
                onPointerDown={(e) => dismissible && dragControls.start(e)}
                aria-hidden
              >
                <span className="h-1.5 w-11 rounded-full bg-paper-edge" />
              </div>
            )}
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="absolute right-3 top-3 hidden rounded-full p-2 text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink sm:block"
              >
                <IconX size={18} />
              </button>
            )}
            <div className="flex items-start gap-3.5">
              {icon}
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-serif text-[1.3rem] font-bold leading-snug tracking-[-0.01em] text-ink">
                  {title}
                </h2>
                {description && (
                  <div id={descId} className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    {description}
                  </div>
                )}
              </div>
            </div>
            {children && <div className="mt-5">{children}</div>}
            {footer && <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── 확인 모달 (confirm() 대체) ─────────────────────────

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [open, setOpen] = useState(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
      setOpen(true);
    });
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setOpen(false);
    },
    [state],
  );

  const danger = state?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={open}
        onClose={() => settle(false)}
        title={state?.title ?? ""}
        description={state?.description}
        icon={
          danger ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-mist text-danger">
              <IconAlert size={20} />
            </span>
          ) : undefined
        }
        footer={
          <>
            <InkButton variant="ghost" onClick={() => settle(false)} className="sm:min-w-24">
              {state?.cancelLabel ?? "취소"}
            </InkButton>
            <InkButton variant={danger ? "danger" : "primary"} onClick={() => settle(true)} data-autofocus className="sm:min-w-24">
              {state?.confirmLabel ?? "확인"}
            </InkButton>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}
