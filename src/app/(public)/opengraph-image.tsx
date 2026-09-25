import { getSettings } from "@/lib/data/settings";
import { formatPeriod } from "@/lib/format";
import { OG_SIZE, renderOgCard } from "@/lib/og";

export const alt = "전시 소개";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image() {
  const settings = await getSettings();
  return renderOgCard({
    eyebrow: settings.organizer,
    title: settings.title,
    subtitle: settings.subtitle || formatPeriod(settings.startDate, settings.endDate) || "학생 작품 전시",
    imageUrl: settings.cover?.urlLg,
    cta: "전시 둘러보기",
  });
}
