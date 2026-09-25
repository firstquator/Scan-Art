import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "전시 정보" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
