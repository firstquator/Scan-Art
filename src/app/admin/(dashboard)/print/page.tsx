import type { Metadata } from "next";
import { PrintStudio } from "@/components/admin/print-studio";
import { listAllArtworks } from "@/lib/data/artworks";

export const metadata: Metadata = { title: "QR 인쇄" };

export default async function PrintPage({ searchParams }: PageProps<"/admin/print">) {
  const { ids } = await searchParams;
  const artworks = await listAllArtworks();
  const preselected = typeof ids === "string" ? ids.split(",").filter(Boolean) : [];
  return <PrintStudio artworks={artworks} preselected={preselected} />;
}
