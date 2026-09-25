import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}><path d="M4.5 12.5l4.6 4.5L19.5 7" /></svg>
);
export const IconX = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3.8l9 15.6H3l9-15.6z" /><path d="M12 10v4.2M12 17.2v.1" /></svg>
);
export const IconInfo = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.1" /></svg>
);
export const IconPlay = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5.3v13.4c0 .8.9 1.3 1.6.8l10.3-6.7c.6-.4.6-1.2 0-1.6L9.6 4.5C8.9 4 8 4.5 8 5.3z" /></svg>
);
export const IconPause = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>
);
export const IconStop = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2.2" /></svg>
);
export const IconSpeaker = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4.2 4.2 0 010 6M18.3 6.5a8 8 0 010 11" /></svg>
);
export const IconMic = (p: IconProps) => (
  <svg {...base(p)}><rect x="9" y="3" width="6" height="11.5" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" /></svg>
);
export const IconUpload = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4.5 15v3.2c0 1 .8 1.8 1.8 1.8h11.4c1 0 1.8-.8 1.8-1.8V15" /></svg>
);
export const IconCamera = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8.2c0-1 .8-1.7 1.7-1.7h2l1.4-2h5.8l1.4 2h2c1 0 1.7.8 1.7 1.7v9.1c0 1-.8 1.7-1.7 1.7H5.7c-1 0-1.7-.8-1.7-1.7z" /><circle cx="12" cy="12.6" r="3.4" /></svg>
);
export const IconTrash = (p: IconProps) => (
  <svg {...base(p)}><path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7M6.5 7l.8 11.4c.1 1 .9 1.6 1.8 1.6h5.8c1 0 1.7-.7 1.8-1.6L17.5 7" /></svg>
);
export const IconGrip = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">{[7, 12, 17].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}</svg>
);
export const IconEye = (p: IconProps) => (
  <svg {...base(p)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const IconEyeOff = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 3l18 18M10.6 5.6c.5-.1.9-.1 1.4-.1 6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.7 3.5M6.6 6.6C4 8.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 004.2 4.2" /></svg>
);
export const IconShare = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 14.5V3.8M8 7.5l4-3.7 4 3.7" /><path d="M8.5 10.5H7a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-1.5" /></svg>
);
export const IconLink = (p: IconProps) => (
  <svg {...base(p)}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>
);
export const IconPrinter = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 9V3.8h10V9M7 17H5a1.5 1.5 0 01-1.5-1.5v-5A1.5 1.5 0 015 9h14a1.5 1.5 0 011.5 1.5v5A1.5 1.5 0 0119 17h-2" /><path d="M7 14h10v6.2H7z" /></svg>
);
export const IconSettings = (p: IconProps) => (
  /* 조절 막대(설정) */
  <svg {...base(p)}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2.2" /><circle cx="9" cy="17" r="2.2" /></svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <svg {...base(p)}><path d="M14.5 5.5L8 12l6.5 6.5" /></svg>
);
export const IconChevronRight = (p: IconProps) => (
  <svg {...base(p)}><path d="M9.5 5.5L16 12l-6.5 6.5" /></svg>
);
export const IconArrowLeft = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
);
export const IconImage = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M20.5 16l-5-5-8.5 8.5" /></svg>
);
export const IconFilm = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10.2 9.3v5.4l4.6-2.7z" fill="currentColor" /></svg>
);
export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4v11.5M7.5 11L12 15.5l4.5-4.5" /><path d="M4.5 16v2.2c0 1 .8 1.8 1.8 1.8h11.4c1 0 1.8-.8 1.8-1.8V16" /></svg>
);
export const IconLogout = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 4.5H6.5a2 2 0 00-2 2v11a2 2 0 002 2H14M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></svg>
);
export const IconTextSize = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 18l4.5-12L12 18M4.6 14h5.8M14 18l3-8 3 8M15 15.5h4" /></svg>
);
export const IconQr = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1" /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5" /></svg>
);
export const IconRefresh = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 11.5A8 8 0 006.3 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0013.7 5.2l2.3-2.2M20 20v-4.5h-4.5" /></svg>
);
export const IconPencil = (p: IconProps) => (
  <svg {...base(p)}><path d="M15.5 4.5l4 4L8 20H4v-4z" /><path d="M13 7l4 4" /></svg>
);
export const IconHome = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /></svg>
);
export const IconUser = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
);
export const IconExpand = (p: IconProps) => (
  <svg {...base(p)}><path d="M14.5 4H20v5.5M9.5 20H4v-5.5M20 4l-6.5 6.5M4 20l6.5-6.5" /></svg>
);
export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 4.5h5.5V10M19.5 4.5L11 13M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4" /></svg>
);
export const IconCalendar = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const IconMove = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" /></svg>
);
