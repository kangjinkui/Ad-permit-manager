# Handoff — 광고물 허가·신고 관리 시스템

> 작성일: 2026-03-27
> 다음 세션에서 이 파일을 읽고 이어서 작업하세요.

---

## 현재 상태: 코드 구현 완료, DB 미실행

모든 코드는 작성되었고 TypeScript 타입 오류도 없음.
**Supabase SQL 실행과 로그인 테스트가 아직 안 된 상태.**

---

## 즉시 해야 할 것 (다음 세션 시작 시)

### Step 1 — Supabase SQL 실행

Supabase 대시보드 → SQL Editor에서 순서대로 실행:

1. `supabase/01_schema.sql` — 테이블 + RLS + 트리거
2. `supabase/02_seed.sql` — 초기 데이터 6건

### Step 2 — Supabase 인증 설정 (대시보드)

Authentication → URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs에 추가: `http://localhost:3000/auth/callback`

Authentication → Email:
- "Confirm email" **비활성화** (magic link 전용)

### Step 3 — 로그인 테스트

```bash
cd web && npm run dev
```

`http://localhost:3000/login` → `@gangnam.go.kr` 메일로 매직링크 테스트

> ⚠️ `.env.local`의 anon key가 `sb_publishable_...` 형식 — 표준 Supabase JWT(`eyJ...`)와 다름.
> 로그인 실패 시 Supabase 대시보드 → Project Settings → API → `anon public` 키 재확인.

---

## 프로젝트 구조

```
Ad-permit-manager/
├── supabase/
│   ├── 01_schema.sql       ← DB 스키마 (실행 필요)
│   └── 02_seed.sql         ← 초기 데이터 (실행 필요)
└── web/
    ├── .env.local           ← Supabase URL/키 설정됨
    └── src/
        ├── lib/
        │   ├── permits.ts   ← DB 조회 함수 (getPermits, getPermit, getPermitStats, getPermitHistory)
        │   ├── mock-data.ts ← 타입 정의 (수정 금지)
        │   ├── auth.ts      ← requireUser()
        │   └── supabase/    ← client.ts, server.ts
        ├── app/
        │   ├── login/       ← 매직링크 로그인 (완성)
        │   ├── auth/callback/ ← 콜백 처리 (완성)
        │   ├── dashboard/   ← 실 데이터 KPI (완성)
        │   ├── permits/
        │   │   ├── page.tsx        ← 목록 + 필터 (완성)
        │   │   ├── new/            ← 신규 등록 폼 + Server Action (완성)
        │   │   ├── [id]/           ← 상세 + 상태변경 + 이력 (완성)
        │   │   └── upload/         ← 엑셀 업로드 (완성)
        └── components/
            ├── permits-table.tsx   ← 서버, Supabase 조회
            ├── permits-filter.tsx  ← 클라이언트, form method=GET
            ├── dashboard-view.tsx  ← props 기반 (stats, recentPermits)
            └── excel-upload-client.tsx ← 클라이언트, xlsx 파싱
```

---

## 구현된 기능 전체

| 기능 | 경로 | 상태 |
|------|------|------|
| 매직링크 로그인 | `/login` | ✅ 완성 |
| 대시보드 KPI | `/dashboard` | ✅ 완성 |
| 허가 목록 + 필터 | `/permits` | ✅ 완성 |
| 신규 등록 | `/permits/new` | ✅ 완성 |
| 상세 + 상태 변경 | `/permits/[id]` | ✅ 완성 |
| 상태 변경 이력 | `/permits/[id]` | ✅ 완성 |
| 엑셀 일괄 업로드 | `/permits/upload` | ✅ 완성 |
| DB 스키마 실행 | Supabase 대시보드 | ❌ 미실행 |
| 로그인 동작 확인 | 실제 테스트 | ❌ 미확인 |

---

## 엑셀 컬럼 매핑 (샘플 파일 기준)

`복사본 업무일지(샘플).xlsx` 실제 헤더:
```
연번 | 종류 | 구분 | 광고주 | 표시장소 | 표시내용 | 규격 | 수량 | 상태 | 처리일자 | 소의심 날짜 | 안전점검  | 연장대상
```
- 처리일자/소의심 날짜: Excel 시리얼 날짜 → `excel-upload-client.tsx`에서 자동 변환
- 안전점검 값 정규화: `"안전점검 대상아님"` → `"대상아님"`
- 연장대상 값 정규화: 포함 여부로 판단

---

## 주요 설계 원칙 (다음 기능 추가 시 참고)

- DB는 snake_case → `lib/permits.ts`의 `toPermitRecord()`로 camelCase 변환
- 필터: URL searchParams → 서버 컴포넌트 처리 (client state 사용 안 함)
- 엑셀: 클라이언트에서 `xlsx.read()` → rows JSON → Server Action 전달
- RLS: `auth.uid() is not null` 패턴 사용 (role 체크 아님)
- ID 형식: `PM-YYYY-NNN` (연도별 카운트 기반 자동 생성)

---

## 잠재적 이슈

1. **anon key 형식**: `sb_publishable_` prefix가 표준 Supabase와 다름 → 로그인 실패 시 키 재확인
2. **ID 레이스 컨디션**: 동시에 여러 건 등록 시 중복 ID 가능성 있음 (소규모 내부 툴이라 허용 가능, 필요 시 DB sequence로 교체)
3. **엑셀 헤더 trailing space**: `"안전점검 "`, `"연장대상  "` 에 공백 포함 — 다른 파일 사용 시 파싱 실패 가능

---

## 다음 세션 이후 가능한 추가 기능

- 로그아웃 버튼
- 심의일정 캘린더 뷰
- 연장 만료 알림
- CSV 내보내기
