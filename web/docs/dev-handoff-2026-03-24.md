# 개발 인수인계

날짜: 2026-03-24
프로젝트: Ad Permit Manager
앱 루트: `web/`

## 요약

오늘 작업으로 앱은 정적 라우트 껍데기 상태에서, 실제로 사용할 수 있는 인증 기반 Next.js/Supabase 구조로 넘어갔습니다.

오늘의 가장 큰 완료 항목은 `/login`에 실제 Supabase 매직 링크 로그인을 연결한 것입니다.

- 서버 액션 기반 폼 제출
- `@gangnam.go.kr` 도메인 검증
- `next`를 통한 리다이렉트 경로 보존
- 세션 교환을 위한 auth callback 라우트
- 미들웨어 기반 라우트 보호

오늘 작업 종료 시점 기준으로 `/login`은 정상 렌더링되며, 로그인 흐름도 코드상으로 연결되어 있습니다. 다음으로 의미 있는 기능 단계는 mock 허가/대시보드 데이터를 실제 Supabase 조회로 교체하는 것입니다.

## 완료된 작업

### 1. 앱 구조 및 라우트 기본 골격

기존 페이지는 다음과 같이 구성되어 있습니다.

- `/`
- `/login`
- `/dashboard`
- `/permits`
- `/permits/new`

주요 파일:

- `web/src/app/page.tsx`
- `web/src/app/login/page.tsx`
- `web/src/app/dashboard/page.tsx`
- `web/src/app/permits/page.tsx`
- `web/src/app/permits/new/page.tsx`

### 2. Supabase 인증 기반 구성

구현된 항목:

- Supabase SSR 서버 클라이언트 헬퍼
- 브라우저 클라이언트 헬퍼
- env 헬퍼
- auth 헬퍼 함수
- 미들웨어 인증 가드

주요 파일:

- `web/src/lib/supabase/server.ts`
- `web/src/lib/supabase/client.ts`
- `web/src/lib/env.ts`
- `web/src/lib/auth.ts`
- `web/middleware.ts`

동작 방식:

- 인증되지 않은 사용자가 `/dashboard` 및 `/permits`에 접근하면 `/login`으로 리다이렉트됨
- 인증된 사용자가 `/login`에 접근하면 `/dashboard`로 리다이렉트됨
- 로그인 페이지로 리다이렉트할 때 `next` 쿼리 문자열이 유지됨

### 3. 실제 `/login` 매직 링크 액션

구현된 항목:

- `/login` 폼이 이제 실제 서버 액션으로 제출됨
- 이메일 입력 여부 검증
- `@gangnam.go.kr` 도메인 검증
- `supabase.auth.signInWithOtp(...)` 호출
- 요청 헤더를 기반으로 callback URL을 동적으로 생성
- 리다이렉트 쿼리 파라미터를 통해 성공/오류 상태 반환

주요 파일:

- `web/src/app/login/actions.ts`
- `web/src/app/login/page.tsx`
- `web/src/lib/auth-redirect.ts`

### 4. Auth callback 라우트

구현된 항목:

- 인증 코드를 세션 쿠키로 교환하는 callback 라우트
- 사용자를 원래의 `next` 경로로 다시 리다이렉트

주요 파일:

- `web/src/app/auth/callback/route.ts`

흐름:

1. 사용자가 `/login`을 엽니다.
2. 이메일을 제출합니다.
3. Supabase가 매직 링크 메일을 발송합니다.
4. 이메일 링크가 `/auth/callback`으로 돌아옵니다.
5. callback이 코드를 세션으로 교환합니다.
6. 사용자는 보존된 목적지로 리다이렉트됩니다.

### 5. Env 설정

생성됨:

- `web/.env.local`

정리됨:

- 루트 `.env` 파일을 Docker Compose가 파싱할 수 있도록 정리함

현재 필요한 env:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tftbsodvblzldpfegmti.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_H28_BrUO68U-26Qc5GL3PQ_2V1-Ltlf
```

## 수행한 검증

### 확인 완료

- 로컬 개발 서버에서 `/login`이 정상 렌더링됨
- `http://127.0.0.1:3001/login`에서 응답 상태 `200` 확인
- 렌더링된 HTML에 다음 문자열이 포함됨:
  - `Authentication`
  - `Magic Link`
  - `name@gangnam.go.kr`
  - `로그인 매직 링크 보내기`
- 렌더링된 HTML에 서버 액션 바인딩이 존재함

### Lint

ESLint 엔트리를 직접 실행해 검증함:

```bash
node .\node_modules\eslint\bin\eslint.js src middleware.ts
```

### 아직 완전히 검증되지 않음

- 실제 `@gangnam.go.kr` 메일박스로 이메일이 정상 발송되는지
- 메일 링크 클릭 후 브라우저에서 callback이 성공하는지
- 프로덕션 빌드

## 알려진 이슈

### 1. 현재 Docker 환경이 불안정함

확인된 문제:

- Docker API 호출이 간헐적으로 실패함
- 컨테이너 로그와 `docker exec`가 신뢰할 수 없는 상태였음
- 재빌드 시도 후 `3000` 포트의 앱이 응답하지 않게 됨

이 때문에 로컬 검증은 `3001` 포트에서 호스트에서 직접 실행한 개발 서버로 진행했습니다.

### 2. 호스트 의존성이 재설치 전까지 불완전했음

오늘 작업 중 해결한 내용:

- `web/`에서 `npm install` 실행
- 이를 통해 `@supabase/ssr` 같은 누락 패키지를 복구함

### 3. 빌드는 여전히 환경/도구 문제로 막혀 있음

확인된 빌드 장애 요인:

- Windows에서 Turbopack 네이티브 바인딩 이슈
- 재설치 전 webpack 빌드 중 `lightningcss` 네이티브 모듈 누락
- Docker/컨테이너 런타임 불안정

즉, 현재의 빌드 실패를 애플리케이션 코드 회귀로 단정할 수는 없습니다.

### 4. 일부 소스 파일에 한글 깨짐이 남아 있음

초기 스캐폴딩 단계에서 생긴 인코딩 손상(mojibake)이 일부 파일에 남아 있습니다.

예시:

- `web/src/components/dashboard-view.tsx`
- `web/src/components/permits-table.tsx`
- `web/src/app/permits/new/page.tsx`
- `web/src/lib/mock-data.ts`

`/login` 페이지 텍스트는 현재 런타임 렌더링 기준으로 정상이나, 다른 여러 페이지는 추가 정리가 필요합니다.

## 현재 기능 상태

### 구현 완료

- Next.js app router 기반 구성
- 공통 레이아웃 및 스타일링
- 로그인 페이지
- 인증 미들웨어
- Supabase env 연결
- 매직 링크 서버 액션
- auth callback 라우트
- 대시보드/목록/신규 페이지 골격
- Supabase 스키마 초안

### 아직 mock 전용

- 대시보드 KPI 데이터
- 허가 목록 데이터
- 검색/필터 로직
- 신규 허가 저장 액션
- 업로드/가져오기 흐름
- 보고서 출력 흐름
- 관리자 통계
- 청문/안전 워크플로우

## 원본 목업 대비 진행률

`ad_permit_manager_mockup (1).html`와 비교했을 때:

- UI 골격/기본 라우트/인증 기반: 대략 60-70% 완료
- 실제 업무 기능: 대략 15-25% 완료
- 전체 프로젝트 진행률: 대략 35-40% 완료

해석:

- 앱 구조는 이제 실제 동작하는 형태가 되었음
- 인증은 더 이상 가짜가 아님
- 핵심 백오피스 워크플로우는 아직 대부분 미구현 상태임

## 내일 가장 적절한 다음 작업

권장 다음 작업:

### mock 허가 목록을 실제 Supabase 조회로 교체

이 작업을 다음으로 해야 하는 이유:

- 앱을 단순 껍데기에서 실제 데이터 기반 워크플로우로 전환할 수 있음
- 스키마, 인증, SSR 조회 경로를 한 번에 검증할 수 있음
- 바로 엑셀 가져오기부터 시작하는 것보다 위험이 낮음

권장 범위:

1. `/permits`를 Supabase 데이터와 연결
2. `permits/page.tsx`에서 서버 사이드로 행 조회
3. 목록 렌더링에서 `mockPermits`를 교체
4. 필요하면 필터 UI는 우선 정적으로 유지
5. 그다음 `/dashboard` KPI 조회로 확장

## 실무 기준 다음 단계

### 옵션 A: 가장 좋은 다음 단계

실제 허가 조회 구현:

1. `web/supabase/schema.sql`의 Supabase SQL이 실행되었는지 확인
2. Supabase에 샘플 레코드 몇 건 삽입
3. mock 목록을 서버 사이드 조회로 교체
4. 그다음 대시보드 지표도 교체

### 옵션 B: 인증을 먼저 끝까지 확인해야 한다면

로그인 전체 흐름 검증 완료:

1. `http://127.0.0.1:3001/login` 열기
2. 실제 `@gangnam.go.kr` 주소 제출
3. Supabase가 메일을 발송하는지 확인
4. Supabase Auth 설정의 redirect URL에 로컬 callback URL이 포함되어 있는지 확인

로컬 허용용 권장 redirect URL:

```text
http://127.0.0.1:3001/auth/callback
```

나중에 Docker `3000`을 사용할 경우 다음도 허용:

```text
http://localhost:3000/auth/callback
```

## 오늘 유용했던 명령어

Lint 직접 실행:

```bash
node .\node_modules\eslint\bin\eslint.js src middleware.ts
```

web 의존성 설치:

```bash
cd web
npm install
```

대체 포트로 로컬 개발 서버 실행:

```bash
cd web
npm run dev -- --hostname 127.0.0.1 --port 3001
```

## 내일 가장 먼저 읽어야 할 중요 파일

다음 순서로 읽는 것을 권장:

1. `web/src/app/login/actions.ts`
2. `web/src/app/auth/callback/route.ts`
3. `web/src/lib/auth.ts`
4. `web/middleware.ts`
5. `web/src/app/permits/page.tsx`
6. `web/src/components/permits-table.tsx`
7. `web/supabase/schema.sql`

## 짧은 인수인계 메모

내일 이어서 작업한다면, 실제 이메일 테스트가 실패하지 않는 이상 인증부터 다시 시작하지 않는 편이 좋습니다.

가장 합리적인 다음 순서는 다음과 같습니다.

- Supabase Auth redirect 설정을 한 번만 확인
- 그다음 `/permits`에 실제 Supabase 읽기 연결
- 이후 대시보드 KPI를 mock 데이터에서 전환
