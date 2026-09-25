import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * 관리자 화면 1차 확인(빠른 리다이렉트). 실제 권한 확인은 각 페이지와 Server Action에서 다시 한다.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const secret = process.env.SESSION_SECRET ?? "local-development-secret-please-change-0000";
  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
