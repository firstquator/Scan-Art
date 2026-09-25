import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { baseContentType, policyFor, uploadKindOf } from "@/lib/storage/policy";
import { writeLocalFile } from "@/lib/storage/server";
import { isSafeUploadPath } from "@/lib/storage/urls";

/** 로컬 개발 전용 업로드. Vercel Blob 토큰이 있으면 쓰지 않는다. */
export async function POST(request: Request) {
  if (env.storageMode !== "local") return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  if (!(await isAdmin())) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });

  const form = await request.formData();
  const pathname = String(form.get("pathname") ?? "");
  const file = form.get("file");
  const kind = uploadKindOf(pathname);

  if (!(file instanceof File) || !kind || !isSafeUploadPath(pathname)) {
    return NextResponse.json({ code: "UPLOAD_FAILED" }, { status: 400 });
  }
  const policy = policyFor(kind);
  if (!policy.allowedContentTypes.includes(baseContentType(file.type))) {
    return NextResponse.json({ code: kind === "image" ? "IMAGE_UNSUPPORTED" : "AUDIO_UNSUPPORTED" }, { status: 400 });
  }
  if (file.size > policy.maximumSizeInBytes) {
    return NextResponse.json({ code: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const url = await writeLocalFile(pathname, new Uint8Array(await file.arrayBuffer()));
  return NextResponse.json({ url });
}
