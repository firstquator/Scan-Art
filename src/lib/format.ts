/** 초 → "1:05" */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 바이트 → "12.3MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

/** "2026-10-01" → "2026. 10. 1." */
export function formatDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return "";
  return `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.`;
}

export function formatPeriod(start: string, end: string): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`;
  return formatDate(start || end);
}

/** ["김민준", "이서연", "박지호"] → "김민준, 이서연, 박지호" */
export function joinArtists(artists: string[]): string {
  return artists.filter(Boolean).join(", ");
}
