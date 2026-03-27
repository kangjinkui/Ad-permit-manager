import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
      <section className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-dark p-8 lg:p-10">
          <p className="eyebrow-dark">Vercel-ready Internal App</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-tight text-white">
            광고물 허가·신고 업무를 웹으로 구조화하는 1차 베이스입니다.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">
            엑셀 기반 업무 흐름을 로그인, 목록, 상태관리, 초기 업로드로 옮기기
            위한 Next.js App Router 초기 화면입니다. 이후 실제 Supabase 인증과
            DB를 연결합니다.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/dashboard" className="button-primary">
              대시보드 보기
            </Link>
            <Link href="/login" className="button-secondary-dark">
              로그인 화면 보기
            </Link>
          </div>
        </div>

        <div className="panel grid gap-4 p-8">
          {[
            "사내 이메일 매직링크 로그인",
            "엑셀 초기 일괄업로드 후 수기등록",
            "고정값 기반 구조화 입력",
            "전체 목록 공유 + 상태 중심 필터",
          ].map((item, index) => (
            <article
              key={item}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Core 0{index + 1}
              </p>
              <p className="mt-2 text-lg font-medium tracking-tight text-slate-950">
                {item}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
