import { readFile } from "node:fs/promises";
import { env } from "@/lib/env";
import { localFilePath } from "@/lib/storage/server";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  webm: "audio/webm",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  ogg: "audio/ogg",
};

/** 로컬 개발 저장소의 파일을 내려준다. */
export async function GET(request: Request, ctx: RouteContext<"/api/dev-files/[...path]">) {
  if (env.storageMode !== "local") return new Response(null, { status: 404 });
  const { path } = await ctx.params;
  const file = localFilePath(path.join("/"));
  if (!file) return new Response(null, { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(/*turbopackIgnore: true*/ file);
  } catch {
    return new Response(null, { status: 404 });
  }

  const ext = file.split(".").pop() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  };

  // iOS Safari는 오디오를 부분 요청(Range)으로만 재생한다.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range) {
    const size = data.byteLength;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.byteLength) } });
}
