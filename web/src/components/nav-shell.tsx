import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/auth";

const baseNavItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/permits", label: "허가/신고 목록" },
  { href: "/permits/new", label: "신규 등록" },
  { href: "/fees", label: "수수료 계산기" },
];

export function NavShell({
  pathname,
  profile,
}: {
  pathname: string;
  profile: Profile | null;
}) {
  const navItems =
    profile?.role === "admin"
      ? [...baseNavItems, { href: "/admin/users", label: "사용자 관리" }]
      : baseNavItems;

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
          내부 업무용 허가/신고 기록과 담당자 확인 흐름을 함께 관리합니다.
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-4 py-3 text-base font-semibold transition"
              style={{
                color: "#ffffff",
                background: active
                  ? "rgba(14, 165, 233, 0.35)"
                  : "rgba(255, 255, 255, 0.12)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          외부 도구
        </p>
        <a
          href="https://signcheck.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl px-4 py-3 text-base font-semibold transition"
          style={{ color: "#ffffff", background: "rgba(255, 255, 255, 0.12)" }}
        >
          광고물 판정기 ↗
        </a>
        <a
          href="https://notebooklm.google.com/notebook/f5fddab6-61bd-496b-90e2-19e21f2fe1a5"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl px-4 py-3 text-base font-semibold transition"
          style={{ color: "#ffffff", background: "rgba(255, 255, 255, 0.12)" }}
        >
          광고물 해설집 ↗
        </a>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        {profile ? (
          <div className="rounded-3xl border border-white/20 bg-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              로그인 계정
            </p>
            <p className="mt-1 text-sm font-medium text-white">{profile.name}</p>
            <p className="text-xs text-slate-400">{profile.email}</p>
          </div>
        ) : null}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/20"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
