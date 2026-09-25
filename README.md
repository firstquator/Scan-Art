# Scan-Art · 작품 이야기

평택특수교육지원센터 학생 작품 전시용 웹앱입니다. 작품 옆에 붙인 QR 코드를 스캔하면 그 작품의 설명 페이지(사진, 작가, 이야기, 목소리, 영상)가 열립니다. 선생님은 관리자 화면에서 작품을 등록하고 QR 명제표를 인쇄할 수 있습니다.

- 설계 문서: [`docs/superpowers/specs/2026-09-25-scan-art-design.md`](docs/superpowers/specs/2026-09-25-scan-art-design.md)
- 기술 구성: Next.js 16 (App Router) · Vercel · Neon Postgres · Vercel Blob · Tailwind CSS 4 · Motion

## 화면

| 경로 | 설명 |
|---|---|
| `/` | 관리자 화면으로 이동 |
| `/exhibition` | 관람객용 전시 표지 (전시 소개 + 공개 작품 목록). 관리자 화면 오른쪽 위 ‘전시 표지’로 바로 갈 수 있어요 |
| `/a/{작품번호}` | 작품 페이지. **QR 코드가 가리키는 주소**이며 바뀌지 않습니다 |
| `/admin` | 관리자: 작품 목록, 순서 바꾸기, 공개 전환 |
| `/admin/artworks/new` | 새 작품 등록 (사진 업로드·촬영, 녹음, 영상, 실시간 미리보기) |
| `/admin/print` | QR 명제표·스티커 인쇄 (A4 자동 배치) |
| `/admin/settings` | 전시명·기간·장소·소개·대표 사진 |

## 로컬에서 실행하기

필요한 것: Node.js 20.9 이상, pnpm

```bash
pnpm install
pnpm dev
```

`http://localhost:3000` 에 들어가 관리자 비밀번호로 로그인합니다.

관리자 비밀번호는 프로젝트 폴더의 `.env` 파일에 있는 `ADMIN_PASSWORD` 값이에요. 값이 없으면 기본값 `0000`을 씁니다. (`.env`는 Git에 올라가지 않아요.)

환경변수를 하나도 설정하지 않아도 동작합니다. 이 경우 로컬 전용 저장소를 사용합니다.

- DB: `.data/pglite` (PGlite, 처음 연결할 때 테이블을 자동으로 만듭니다)
- 파일: `.data/uploads`

## 배포하기 (Vercel + Neon + Vercel Blob)

1. **GitHub에 저장소 올리기**
2. **Vercel에서 프로젝트 만들기**: vercel.com → Add New → Project → 이 저장소 선택
3. **Neon DB 연결**: 프로젝트 → Storage → Create Database → **Neon** 선택 → 프로젝트에 연결
   - `DATABASE_URL`이 자동으로 들어갑니다.
4. **Blob 저장소 연결**: Storage → Create → **Blob** → 프로젝트에 연결
   - `BLOB_READ_WRITE_TOKEN`이 자동으로 들어갑니다.
5. **환경변수 추가**: Settings → Environment Variables

   | 이름 | 값 |
   |---|---|
   | `ADMIN_PASSWORD` | 관리자 비밀번호 (넣지 않으면 `0000`이 되니 **꼭 바꿔 주세요**) |
   | `SESSION_SECRET` | 32자 이상 무작위 문자열 (예: `openssl rand -base64 32`) |
   | `NEXT_PUBLIC_SITE_URL` | 최종 사이트 주소 (예: `https://scan-art.vercel.app`) |

6. **다시 배포(Redeploy)** 합니다. 빌드할 때 DB 테이블이 자동으로 만들어집니다(`scripts/migrate.mjs`).

> ⚠️ **QR을 인쇄하기 전에 `NEXT_PUBLIC_SITE_URL`을 최종 주소로 확정해 주세요.** QR 코드에는 이 주소가 들어가고, 인쇄한 뒤에는 바꿀 수 없습니다. 도메인을 바꿀 계획이 있다면 먼저 바꾼 뒤 인쇄하세요. 인쇄 화면은 지금 접속한 주소와 이 값이 다르면 경고를 띄웁니다.

### 무료 한도 (2026-09 기준)

| 서비스 | 무료 제공량 | 참고 |
|---|---|---|
| Vercel Hobby | 월 전송 100GB, 함수 호출 100만 회 | **비상업적 용도만 허용** |
| Neon Free | 0.5GB, 월 100 CU-시간 | 5분 쉬면 멈추고 요청이 오면 자동으로 깨어남. 데이터는 지워지지 않음 |
| Vercel Blob Hobby | 저장 1GB, 월 쓰기 2,000회 | 사진은 올릴 때 WebP로 줄여서 장당 약 100~300KB |

관리자 목록 화면에 저장 공간 사용량이 표시되고, 80%를 넘으면 경고합니다.

## 개발 명령어

```bash
pnpm dev          # 개발 서버
pnpm lint         # ESLint (alert/confirm/prompt 사용 금지 규칙 포함)
pnpm typecheck    # TypeScript
pnpm test         # 단위 테스트 (Vitest)
pnpm test:e2e     # E2E 테스트 (Playwright, 별도 로컬 DB로 서버를 띄움)
pnpm db:generate  # 스키마(src/db/schema.ts)를 바꾼 뒤 마이그레이션 SQL 생성
pnpm db:migrate   # DATABASE_URL의 DB에 마이그레이션 적용
```

## 만들 때 지키는 규칙

- `alert()` / `confirm()` / `prompt()` 금지. 알림은 `useToast()`, 확인이 필요하면 `useConfirm()`을 씁니다.
- 사용자에게 보이는 문구는 모두 자연스러운 한국어로 씁니다. 오류는 `src/lib/errors.ts`의 코드 → 한국어 문구 매핑을 거쳐서만 보여줍니다.
- 이미지는 브라우저에서 WebP(1600/800px)로 변환한 뒤 올립니다. 서버 업로드 토큰도 WebP만 허용합니다.
- 모든 페이지는 검색엔진 수집 차단(`noindex`) 상태입니다. 공유 미리보기 봇만 허용합니다.

## 실제 기기 확인 목록

배포 후 휴대폰으로 한 번씩 확인해 주세요.

- [ ] 인쇄한 QR을 iPhone 기본 카메라, Android 카메라로 스캔
- [ ] 작품 사진 좌우 스와이프, 전체 화면 두 손가락 확대, 아래로 쓸어 닫기
- [ ] 관리자 화면에서 휴대폰으로 사진 촬영 → 업로드
- [ ] 휴대폰으로 목소리 녹음 → 저장 → 다른 휴대폰(iPhone)에서 재생
- [ ] 녹음이 없는 작품에서 ‘읽어주기’
- [ ] 카카오톡으로 작품 링크 공유 → 미리보기 카드 확인

> 녹음(마이크)은 보안 연결(https)에서만 동작합니다. 배포된 주소에서는 문제없지만, 같은 와이파이의 다른 기기에서 `http://192.168.x.x`로 개발 서버에 접속하면 녹음이 막힙니다.
