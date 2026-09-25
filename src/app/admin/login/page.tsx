import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/auth/server";
import { getSettings } from "@/lib/data/settings";
import { nanumPen } from "@/lib/fonts";

export const metadata: Metadata = { title: "관리자 입장" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const settings = await getSettings();

  return (
    <main className={`${nanumPen.variable} flex min-h-dvh items-center justify-center px-5 py-12`}>
      <div className="w-full max-w-[400px] animate-float-in">
        <div className="mb-7 text-center">
          <p className="font-hand text-[1.7rem] leading-none text-blue-deep">{settings.organizer}</p>
          <h1 className="mt-3 font-serif text-[1.9rem] font-bold tracking-[-0.02em] text-ink">{settings.title}</h1>
          <p className="mt-1.5 text-[15px] text-ink-soft">작품 관리 화면입니다</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
