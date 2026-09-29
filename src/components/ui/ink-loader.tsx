import { cn } from "@/lib/cn";

/** 먹 고리 로딩 표시: 쪽빛 붓이 원을 그리며 돌고, 가운데 낙관이 숨 쉬듯 커졌다 작아진다. */
export function InkLoader({ size = 44, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span className={cn("ink-loader inline-flex flex-col items-center gap-2.5", className)} role={label ? "status" : undefined}>
      <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" style={{ animation: "ink-ring-spin 1.8s linear infinite" }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-blue-mist)" strokeWidth="3.5" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="var(--color-blue)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="126"
            style={{ animation: "ink-ring-draw 1.6s var(--ease-ink) infinite" }}
          />
        </svg>
        <svg
          viewBox="0 0 30 30"
          style={{ width: size * 0.42, height: size * 0.42, animation: "ink-seal-breathe 1.6s ease-in-out infinite" }}
        >
          <rect x="2.5" y="2.5" width="25" height="25" rx="5" fill="var(--color-blue)" transform="rotate(-4 15 15)" />
          <text x="15" y="20.5" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fbf8f2" fontFamily="var(--font-serif)" transform="rotate(-4 15 15)">
            展
          </text>
        </svg>
      </span>
      {label && <span className="font-hand text-[1.3rem] leading-none text-blue-deep">{label}</span>}
    </span>
  );
}
