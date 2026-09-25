/**
 * 사용자에게 보여주는 모든 오류 문구.
 * 원본 오류(영어, 스택 등)는 절대 화면에 내보내지 않고 서버 로그에만 남긴다.
 */
export const ERROR_MESSAGES = {
  UNKNOWN: "잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
  NETWORK: "인터넷 연결이 불안정해요. 연결을 확인한 뒤 다시 시도해 주세요.",
  UNAUTHORIZED: "로그인이 필요해요. 다시 로그인해 주세요.",
  LOGIN_FAILED: "비밀번호가 맞지 않아요. 다시 입력해 주세요.",
  LOGIN_LOCKED: "비밀번호를 여러 번 틀렸어요. 5분 뒤에 다시 시도해 주세요.",
  LOGIN_EMPTY: "비밀번호를 입력해 주세요.",
  VALIDATION: "입력한 내용을 다시 확인해 주세요.",
  NOT_FOUND: "작품을 찾을 수 없어요. 이미 삭제되었을 수 있어요.",
  SAVE_FAILED: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
  DELETE_FAILED: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
  REORDER_FAILED: "순서를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
  UPLOAD_FAILED: "파일을 올리지 못했어요. 다시 시도해 주세요.",
  UPLOAD_PENDING: "아직 올리는 중이거나 실패한 파일이 있어요. 파일 상태를 확인해 주세요.",
  FILE_TOO_LARGE: "파일이 너무 커요. 더 작은 파일을 사용해 주세요.",
  IMAGE_UNSUPPORTED: "이 사진은 읽을 수 없어요. JPG, PNG, HEIC 사진을 사용해 주세요.",
  IMAGE_PROCESS_FAILED: "사진을 변환하지 못했어요. 다른 사진으로 다시 시도해 주세요.",
  IMAGE_LIMIT: "사진은 작품마다 12장까지 올릴 수 있어요.",
  MIC_DENIED: "마이크 사용이 허용되지 않았어요. 브라우저 설정에서 마이크 권한을 켜 주세요.",
  MIC_NOT_FOUND: "마이크를 찾을 수 없어요. 마이크가 연결되어 있는지 확인해 주세요.",
  RECORDING_UNSUPPORTED: "이 브라우저에서는 녹음을 할 수 없어요. 녹음 파일을 올려 주세요.",
  RECORDING_FAILED: "녹음 중 문제가 생겼어요. 다시 녹음해 주세요.",
  AUDIO_UNSUPPORTED: "이 소리 파일은 사용할 수 없어요. m4a, mp3, webm 파일을 올려 주세요.",
  AUDIO_TOO_LONG: "녹음은 3분까지 사용할 수 있어요.",
  YOUTUBE_INVALID: "유튜브 영상 주소가 올바르지 않아요. 영상 주소를 그대로 붙여넣어 주세요.",
  COPY_FAILED: "링크를 복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.",
  PRINT_EMPTY: "인쇄할 작품을 하나 이상 골라 주세요.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, options?: { cause?: unknown }) {
    super(code, options);
    this.name = "AppError";
    this.code = code;
  }
}

export function messageFor(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && value in ERROR_MESSAGES;
}

/** 어떤 오류든 사용자에게 보여줄 한국어 문구로 바꾼다. */
export function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) return error.code;
  if (error && typeof error === "object" && "code" in error && isErrorCode(error.code)) {
    return error.code;
  }
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "MIC_DENIED";
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") return "MIC_NOT_FOUND";
    if (error.name === "NotSupportedError") return "RECORDING_UNSUPPORTED";
  }
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) {
    return "NETWORK";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "NETWORK";
  return "UNKNOWN";
}

export function toUserMessage(error: unknown): string {
  return messageFor(toErrorCode(error));
}

/** Server Action 결과. 실패해도 예외 대신 한국어 문구와 함께 돌려준다. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; fieldErrors?: Record<string, string> };

export function fail(code: ErrorCode, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, code, message: messageFor(code), fieldErrors };
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
