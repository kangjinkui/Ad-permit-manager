import Link from "next/link";
import type { StaffProgress } from "@/lib/permits";

type Props = {
  progress: StaffProgress[];
  activeStaffName?: string;
};

export function StaffProgressBoard({ progress, activeStaffName }: Props) {
  if (progress.length === 0) return null;

  const totalInProgress = progress.reduce((sum, p) => sum + p.inProgress, 0);
  const totalCompleted = progress.reduce((sum, p) => sum + p.completed, 0);

  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-950">담당자별 처리 현황</h3>
        <p className="text-sm text-slate-600">
          전체 진행중 <span className="font-semibold text-amber-700">{totalInProgress}</span>건 ·
          처리완료 <span className="font-semibold text-emerald-700">{totalCompleted}</span>건
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        공문발송 · 이메일 발송완료 · 직접방문수령은 처리완료, 그 외 상태는 진행중으로 집계합니다.
        카드를 누르면 해당 담당자 건만 표시됩니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {progress.map((p) => {
          const total = p.inProgress + p.completed;
          const rate = total > 0 ? Math.round((p.completed / total) * 100) : 0;
          const active = p.staffName === activeStaffName;
          const href =
            p.staffName === "미지정"
              ? "/permits"
              : `/permits?staffName=${encodeURIComponent(p.staffName)}`;

          return (
            <Link
              key={p.staffName}
              href={active ? "/permits" : href}
              className={`rounded-2xl border p-4 transition hover:border-slate-400 ${
                active ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-slate-900">{p.staffName}</p>
                <p className="text-xs text-slate-500">총 {total}건</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-amber-50 py-2">
                  <p className="text-xs text-amber-800">진행중</p>
                  <p className="text-2xl font-semibold text-amber-700">{p.inProgress}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 py-2">
                  <p className="text-xs text-emerald-800">처리완료</p>
                  <p className="text-2xl font-semibold text-emerald-700">{p.completed}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${rate}%` }} />
              </div>
              <p className="mt-1 text-right text-xs text-slate-500">완료율 {rate}%</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
