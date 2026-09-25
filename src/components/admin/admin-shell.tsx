"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { IconExternal, IconEye, IconImage, IconLogout, IconPrinter, IconSettings } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "작품", icon: IconImage, match: (p: string) => p === "/admin" || p.startsWith("/admin/artworks") },
  { href: "/admin/print", label: "인쇄", icon: IconPrinter, match: (p: string) => p.startsWith("/admin/print") },
  { href: "/admin/settings", label: "설정", icon: IconSettings, match: (p: string) => p.startsWith("/admin/settings") },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-paper-edge/70 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md print:hidden">
        <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 -rotate-3 items-center justify-center rounded-lg bg-blue font-serif text-lg font-bold text-paper-light shadow-[0_4px_10px_-4px_rgb(42_92_170/0.6)]">
              展
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-[16px] font-bold leading-tight text-ink">{title}</span>
              <span className="block text-[12px] leading-tight text-ink-faint">작품 관리</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 sm:flex" aria-label="관리 메뉴">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold transition-colors",
                    active ? "text-blue-deep" : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      className="absolute inset-0 rounded-xl bg-blue-mist"
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                    />
                  )}
                  <item.icon size={18} className="relative" />
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <a
              href="/exhibition"
              target="_blank"
              rel="noopener"
              title="관람객이 보는 전시 표지를 새 탭에서 엽니다"
              className="group flex h-10 items-center gap-2 rounded-full border border-blue/25 bg-blue-mist/70 pl-3 pr-3.5 text-[14px] font-semibold text-blue-deep transition-[background-color,border-color,transform] hover:border-blue/45 hover:bg-blue-mist active:scale-[0.97]"
            >
              <IconEye size={18} />
              <span className="hidden min-[420px]:inline">전시 표지</span>
              <IconExternal size={14} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                title="관리자 화면에서 나갑니다"
                className="flex h-10 items-center gap-2 rounded-full border border-danger/20 bg-danger-mist/60 pl-3 pr-3.5 text-[14px] font-semibold text-danger transition-[background-color,border-color,transform] hover:border-danger/40 hover:bg-danger-mist active:scale-[0.97]"
              >
                <IconLogout size={17} />
                <span className="hidden min-[420px]:inline">나가기</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}

      {/* 휴대폰: 아래 탭 막대 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-edge/70 bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden print:hidden"
        aria-label="관리 메뉴"
      >
        <div className="grid grid-cols-3">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors",
                  active ? "text-blue" : "text-ink-faint",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab-dot"
                    className="absolute top-0 h-[3px] w-10 rounded-b-full bg-blue"
                    transition={{ type: "spring", stiffness: 480, damping: 36 }}
                  />
                )}
                <item.icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
