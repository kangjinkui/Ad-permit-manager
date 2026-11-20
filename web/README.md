This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## 옥외광고물 검토서

기존 Supabase 환경은 `supabase/13_migration_permit_reviews.sql`을 적용한 뒤 사용합니다. 신규 환경은 `supabase/schema.sql`에 검토서 테이블과 비공개 사진 저장소가 포함되어 있습니다. 지원 서식이 있는 허가의 상세 화면에서 **검토서 작성**을 열 수 있습니다.

`npm run test:review`는 9종 서식으로 가상 검토서를 생성하고 파일 구조와 치환 결과를 검사합니다. 한컴오피스 한글에서의 페이지 배치는 배포 전 실열기로 확인합니다. 통합 명세 Markdown에서 서버용 서식을 다시 만들려면 PowerShell에서 `./scripts/prepare-review-templates.ps1 -SpecificationPath <명세 파일 경로>`를 실행합니다.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
