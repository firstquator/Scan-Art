import type { ErrorCode } from "@/lib/errors";
import type { AudioInput, ImageInput } from "@/lib/validation";

export type UploadStatus = "processing" | "uploading" | "done" | "error";

/** 편집 화면의 사진 한 장. 올리는 중에도 목록에 보이도록 상태를 함께 가진다. */
export interface EditorImage {
  key: string;
  status: UploadStatus;
  progress: number;
  /** 올리기 전 미리보기(브라우저 임시 주소) */
  localPreview?: string;
  data?: ImageInput;
  errorCode?: ErrorCode;
  file?: File;
}

export type EditorAudio = AudioInput;
