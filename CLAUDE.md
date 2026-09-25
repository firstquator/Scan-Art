@AGENTS.md

# Scan-Art

평택특수교육지원센터 학생 작품 QR 전시 앱. 설계: `docs/superpowers/specs/2026-09-25-scan-art-design.md`

## 규칙

- `alert()`/`confirm()`/`prompt()` 금지(ESLint가 막음). 알림은 `useToast()`, 확인은 `useConfirm()` (`src/components/ui`).
- 사용자에게 보이는 문구는 전부 자연스러운 한국어. 오류는 `src/lib/errors.ts`의 `ErrorCode` → 한국어 매핑으로만 노출하고, 원본 오류는 `console.error`로 서버 로그에만 남긴다. 새 코드를 추가하면 `errors.test.ts`가 한국어 여부를 검사한다.
- Server Action은 예외를 던지지 않고 `ActionResult`(`ok`/`fail`)를 돌려준다. 관리자 액션은 `guarded()`로 감싼다.
- 이미지는 브라우저에서 WebP로 변환(`src/lib/image`) 후 업로드. 서버 토큰은 `image/webp`만 허용.
- `/a/[id]` 주소 형식은 인쇄된 QR과 묶여 있으므로 바꾸지 않는다.
- 관람 화면 컴포넌트(`src/components/artwork`)는 관리자 휴대폰 미리보기에서도 쓰이므로 반응형은 뷰포트 `sm:` 대신 컨테이너 쿼리(`@2xl:`)를 쓴다.

## 로컬 모드

`DATABASE_URL`이 없으면 PGlite(`.data/pglite`), `BLOB_READ_WRITE_TOKEN`이 없으면 로컬 파일 저장소(`.data/uploads`, `/api/dev-files`)를 쓴다. 관리자 비밀번호 기본값 `scanart`.
