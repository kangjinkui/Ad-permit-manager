# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

강남구 옥외광고물 허가·신고 관리 시스템. Next.js 16 App Router + Supabase(PostgreSQL + Auth) 스택.
Magic link 인증 전용 내부 업무 도구. 사용자는 `@gangnam.go.kr` 이메일로만 가입 가능하며, 관리자 승인 후 활성화.

## Development Commands

모든 명령은 프로젝트 루트에서 실행 (docker compose 파일 위치).

```bash
# Docker로 개발 서버 실행 (권장)
docker compose up --build          # 컨테이너 시작 (http://localhost:3000)
docker compose down                # 중지

# 컨테이너 내 셸 접속
docker exec -it ad-permit-manager-web bash

# 로컬 직접 실행
cd web && npm install && npm run dev

# 린트
cd web && npm run lint

# 타입 체크 (소스 파일만, .next 제외)
cd web && npx tsc --noEmit --skipLibCheck

# 프로덕션 빌드 확인 (컨테이너 내)
docker exec ad-permit-manager-web bash -lc "cd /app/web && NODE_ENV=production npm run build"
```

## Architecture

### Next.js 버전 주의

**Next.js 16 / React 19** 사용 — 기존 지식과 API가 다를 수 있음.  
코드 작성 전 반드시 `web/node_modules/next/dist/docs/` 가이드를 확인할 것.

### 인증 흐름

```
/login (magic link 요청)
  → Supabase Auth 이메일 발송
  → /auth/callback (세션 교환)
  → DB trigger: auth.users → profiles 자동 생성 (status='pending')
  → /login/pending (승인 대기)
  → admin이 /admin/users 에서 승인
  → 활성화 후 /dashboard 접근 가능
```

`lib/auth.ts`의 가드 함수:
- `requireStaff()` — active 상태인 모든 사용자 허용 (`requireActiveUser()` 래퍼)
- `requireAdmin()` — active + role='admin' 필요
- `getProfile()` — 리다이렉트 없이 프로필 조회 (null 반환 가능, 비로그인 페이지용)
- `hasSupabaseEnv()` — 환경변수 없을 때 SetupBanner 표시용 (graceful degradation)

모든 페이지에서 `envReady` 패턴을 따름:
```ts
const envReady = hasSupabaseEnv();
const profile = envReady ? await requireStaff() : await getProfile();
```

### 데이터 레이어

- `lib/mock-data.ts` — 타입 정의 전용 (`PermitRecord`, `PermitKind`, `PermitStatus` 등). **수정 금지**.
- `lib/permits.ts` — Supabase 쿼리 함수. DB snake_case → camelCase 변환 (`toPermitWithStaff`).  
  `PermitWithStaff = PermitRecord & { staffName, staffTitle, notes, reviewOpinion }`.
- `lib/auth.ts` — 프로필 조회 및 인증 가드.
- `lib/fees.ts` — 수수료 계산 로직.
- `lib/hwpx-generator.ts` — HWPX(한글 문서) 생성. JSZip으로 `public/templates/deliberation_template.hwpx` 조작.

### 주요 페이지 구조

| 경로 | 설명 |
|------|------|
| `/dashboard` | KPI 통계 |
| `/permits` | 목록 + URL searchParams 기반 필터 |
| `/permits/new` | 수동 등록 (규격·조명·검토의견 포함) |
| `/permits/[id]` | 상세 + 상태변경 + 이력. 상태가 "소심의 상정예정"이면 담당자 검토의견 필드 노출 |
| `/permits/upload` | 엑셀 일괄 업로드 |
| `/deliberation` | 소심의 의결서(HWPX) 생성 — "소심의 상정예정" 건만 표시 |
| `/fees` | 수수료 계산기 |
| `/admin/users` | 사용자 승인·직급 관리 (admin 전용) |

### Server Action 패턴

각 페이지 폴더 하위 `actions.ts`에 `"use server"` 함수 배치.  
필터는 client state 없이 URL searchParams → 서버 컴포넌트에서 처리.

**페이지 저장 시 토스트 피드백**이 필요하면 `FormWithToast` 컴포넌트를 사용:
```tsx
<FormWithToast action={updatePermit} successMessage="내용이 저장되었습니다.">
  <input type="hidden" name="permit_id" value={permit.id} />
  {/* 폼 필드 */}
</FormWithToast>
```
`FormWithToast`는 `redirect()`를 호출하지 않는 Server Action에서만 동작 (redirect하면 페이지 이동됨).

**조건부 필드**가 필요한 폼은 클라이언트 컴포넌트로 분리:  
예) `permits/new/new-permit-form.tsx` — 상태 선택에 따라 담당자 검토의견 필드 동적 노출.  
`<form action={serverAction}>` 방식은 Client Component에서도 동작.

### 컴포넌트 분리 패턴

서버 컴포넌트(데이터 패칭) + 클라이언트 컴포넌트(인터랙션) 명확히 분리:
- `PermitsTable` (서버) → `PermitsFilter` + `PermitsTableClient` (클라이언트)
- `DeliberationPage` (서버) → `DeliberationClient` (클라이언트)
- `NewPermitPage` (서버) → `NewPermitForm` (클라이언트)

### HWPX 의결서 생성

`public/templates/deliberation_template.hwpx`(ZIP 포맷)의 `Contents/section0.xml`을 `<hp:tc>` 셀 단위로 치환.  
`generateDeliberationHwpx(permit, committeeNo, hearingDateOverride?)` 형태로 호출.  
규격·조명·담당자 검토의견은 permit 레코드(`width`, `height`, `lighting`, `reviewOpinion`)에서 직접 읽음 — 의결서 생성 UI에서 별도 입력 불필요.

주요 셀 인덱스 (`split("<hp:tc ")` 기준):

| 셀 | 내용 |
|----|------|
| 3 | 광고물 위치 (place) |
| 7 | 광고주 성명 (advertiser) |
| 14-18 | 광고물 현황 체크 (kind → KIND_TO_CHECK_CELL 매핑) |
| 20 | 상호 (advertiser) |
| 22 | 광고물 종류 (kind) |
| 24 | 광고 내용 (content) |
| 26 | 규격 가로×세로 (width, height) |
| 28 | 조명 (lighting) |
| 30 | 직급·담당자명 (staffTitle, staffName) |
| 33 | 담당자 검토의견 (reviewOpinion) |
| 60 | 말미 날짜 |

API Route: `POST /api/deliberation/generate` → `{ permitId, committeeNo, hearingDate? }` → HWPX 파일 다운로드.

### DB 마이그레이션

`web/supabase/` 폴더에 번호순으로 관리. 새 마이그레이션은 다음 번호로 파일 생성 후 Supabase SQL Editor에서 수동 실행.  
현재 최신: `11_migration_review_opinion.sql` (`permit_records.review_opinion TEXT` 컬럼 추가).

`permit_records` 주요 컬럼: `record_no(PK)`, `kind`, `category`, `advertiser`, `place`, `content`, `quantity`, `status`, `processed_at`, `hearing_at`, `safety_check`, `renewal_target`, `source_type`, `notes`, `permit_fee`, `safety_fee`, `width`, `height`, `lighting`, `review_opinion`, `created_by(FK→profiles)`, `updated_by(FK→profiles)`.

`profiles` 컬럼: `id`, `email`, `name`, `role`, `status`, `department`, `title`.

### 엑셀 업로드

`excel-upload-client.tsx`에서 파싱 후 `bulkCreatePermits(rows)` Server Action 호출.  
헤더에 trailing space가 포함될 수 있으므로 파싱 시 `.trim()` 처리 중.  
업로드 건은 `source_type: "excel"`, 수동 등록은 `source_type: "manual"`.

## Environment Variables

`web/.env.local` 필수:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

환경변수 없어도 앱은 기동되며 SetupBanner 표시 (graceful degradation).

## Known Caveats

- **record_no ID 형식**: `PM-YYYY-NNN` — 동시 등록 시 중복 가능성 있음 (소규모 내부 툴이라 허용).
- **엑셀 업로드 헤더**: trailing space 포함 헤더 처리 중. 다른 양식 사용 시 `excel-upload-client.tsx` 파싱 로직 확인 필요.
- **Supabase anon key**: `sb_publishable_` prefix 형식일 경우 표준 JWT(`eyJ...`)와 다름 — 로그인 실패 시 대시보드에서 재확인.
- **타입 체크**: `npx tsc --noEmit` 단독 실행 시 `.next/dev/types/validator.ts` 오류 발생 — `--skipLibCheck` 플래그 추가 필요.
