import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-context";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth/server";
import { getSettings } from "@/lib/data/settings";
import { env } from "@/lib/env";
import { nanumPen } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "작품 관리" };

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage();
  const settings = await getSettings();

  return (
    <AdminProvider
      value={{
        storageMode: env.storageMode,
        siteUrl: SITE_URL,
        exhibitionTitle: settings.title,
        organizer: settings.organizer,
      }}
    >
      <div className={nanumPen.variable}>
        <AdminShell title={settings.title}>{children}</AdminShell>
      </div>
    </AdminProvider>
  );
}
