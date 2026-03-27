import Link from "next/link";
import { clsx } from "clsx";

const navItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/permits", label: "허가/신고 목록" },
  { href: "/permits/new", label: "신규 등록" },
  { href: "/login", label: "로그인" },
];

export function NavShell({ pathname }: { pathname: string }) {
  return (
    <aside className="panel-dark flex flex-col gap-6 p-5">
      <div className="rounded-[28px] border border-white/10 bg-linear-to-br from-sky-500/25 to-cyan-300/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200/80">
          Gangnam District
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          광고물 허가·신고 관리
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          로그인, 등록, 상태관리, 엑셀 초기이관을 Vercel 배포 구조에 맞게
          통합하는 내부 업무 앱 초안입니다.
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-2xl px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-sky-500/20 text-white ring-1 ring-sky-300/30"
                  : "bg-white/4 text-slate-300 hover:bg-white/8 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/8 bg-white/4 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          인증 방향
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-200">
          `@gangnam.go.kr` 메일 주소로 Supabase 매직링크 로그인을 적용할 예정입니다.
        </p>
      </div>
    </aside>
  );
}
