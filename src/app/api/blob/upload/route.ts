import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/server";
import { policyFor, uploadKindOf } from "@/lib/storage/policy";
import { isSafeUploadPath } from "@/lib/storage/urls";

/** 브라우저가 Vercel Blob에 직접 올릴 수 있도록 짧게 쓰는 업로드 토큰을 발급한다. */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
        const kind = uploadKindOf(pathname);
        if (!kind || !isSafeUploadPath(pathname)) throw new Error("VALIDATION");
        return { ...policyFor(kind), addRandomSuffix: false, allowOverwrite: false };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error && error.message === "UNAUTHORIZED" ? "UNAUTHORIZED" : "UPLOAD_FAILED";
    if (code !== "UNAUTHORIZED") console.error("[blob upload]", error);
    return NextResponse.json({ code }, { status: code === "UNAUTHORIZED" ? 401 : 400 });
  }
}
