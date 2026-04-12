# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

강남구 옥외광고물 허가·신고 관리 시스템. Next.js 16 App Router + Supabase(PostgreSQL + Auth) 스택.
Magic link 인증 전용 내부 업무 도구. 사용자는 `@gangnam.go.kr` 이메일로만 가입 가능하며, 관리자 승인 후 활성화.

## Development Commands

모든 명령은 `web/` 디렉터리에서 실행.

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
- `requireStaff()` — active 상태 필요
- `requireAdmin()` — active + role='admin' 필요
- `hasSupabaseEnv()` — 환경변수 없을 때 SetupBanner 표시용 (graceful degradation)

### 데이터 레이어

- `lib/mock-data.ts` — 타입 정의 전용 (`PermitRecord`, `PermitKind`, `PermitStatus` 등). **수정 금지**.
- `lib/permits.ts` — Supabase 쿼리 함수. DB snake_case → camelCase 변환 (`toPermitWithStaff`).  
  `PermitWithStaff = PermitRecord & { staffName, staffTitle, notes }`.
- `lib/auth.ts` — 프로필 조회 및 인증 가드.
- `lib/fees.ts` — 수수료 계산 로직.
- `lib/hwpx-generator.ts` — HWPX(한글 문서) 생성. JSZip으로 `public/templates/deliberation_template.hwpx` 조작.

### 주요 페이지 구조

| 경로 | 설명 |
|------|------|
| `/dashboard` | KPI 통계 |
| `/permits` | 목록 + URL searchParams 기반 필터 |
| `/permits/new` | 수동 등록 |
| `/permits/[id]` | 상세 + 상태변경 + 이력 |
| `/permits/upload` | 엑셀 일괄 업로드 |
| `/deliberation` | 소심의 의결서(HWPX) 생성 |
| `/fees` | 수수료 계산기 |
| `/admin/users` | 사용자 승인·직급 관리 (admin 전용) |

### Server Action 패턴

각 페이지 폴더 하위 `actions.ts`에 `"use server"` 함수 배치.  
필터는 client state 없이 URL searchParams → 서버 컴포넌트에서 처리.  
Client Component는 필터(`permits-filter.tsx`), 엑셀 업로드(`excel-upload-client.tsx`), 수수료 계산기, 의결서 생성 UI 등 interaction이 필요한 곳만 사용.

### HWPX 의결서 생성

`public/templates/deliberation_template.hwpx`(ZIP 포맷)의 `Contents/section0.xml`을 파싱해 `<hp:tc>` 셀 단위로 직접 치환.  
API Route: `POST /api/deliberation/generate` → `{ permitId, committeeNo }` → HWPX 파일 다운로드.  
셀 30: `직급` → `staffTitle`, `○○○` → `staffName` 치환.

### DB 마이그레이션

`web/supabase/` 폴더에 번호순으로 관리. 새 마이그레이션은 다음 번호로 파일 생성 후 Supabase SQL Editor에서 수동 실행.  
현재 최신: `10_migration_staff_title.sql` (profiles.title 컬럼 추가).

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
