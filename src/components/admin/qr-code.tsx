"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export const QR_DARK = "#1f1e1c";

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: QR_DARK, light: "#00000000" },
  });
}

export async function qrPngDataUrl(text: string, width = 1200): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 2,
    width,
    color: { dark: QR_DARK, light: "#ffffff" },
  });
}

/** QR 코드(SVG). 인쇄해도 깨지지 않는다. */
export function QrCode({ value, className, label }: { value: string; className?: string; label?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    qrSvg(value).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <span
      role="img"
      aria-label={label ?? "QR 코드"}
      className={cn("block aspect-square [&>svg]:h-full [&>svg]:w-full", !svg && "rounded bg-paper-deep/60", className)}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
