import Link from "next/link";
import type { PermitRecord } from "@/lib/mock-data";
import type { PermitStats } from "@/lib/permits";

const statusTone: Record<string, string> = {
  직접방문수령: "bg-emerald-100 text-emerald-700",
  우편발송예정: "bg-amber-100 text-amber-800",
  내용보완: "bg-rose-100 text-rose-700",
  공문발송: "bg-sky-100 text-sky-700",
  "서울시심의 상정예정": "bg-violet-100 text-violet-700",
  이메일발송완료: "bg-cyan-100 text-cyan-700",
};

type Props = {
  stats: PermitStats;
  recentPermits: PermitRecord[];
};

export function DashboardView({ stats, recentPermits }: Props) {
  const metrics = [
    { label: "전체 관리건", value: stats.total, hint: "엑셀 초기이관 + 수기등록 포함" },
    { label: "심의 일정 포함", value: stats.reviewScheduled, hint: "심의일자가 잡힌 항목" },
    { label: "안전점검 대상", value: stats.pendingSafety, hint: "별도 확인이 필요한 건" },
    { label: "수기 등록 건", value: stats.manualCount, hint: "사이트에서 직접 입력한 건" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="panel grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="eyebrow">Server-first Dashboard</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
            담당자가 로그인하면 허가·신고 현황을 한 화면에서 확인합니다.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            KPI, 최근 변경건, 예정 심의 목록을 서버 컴포넌트에서 병렬 조회합니다.
          </p>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-slate-50">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            운영 원칙
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
            <li>사내 이메일 매직링크 로그인</li>
            <li>초기 엑셀 일괄 업로드</li>
            <li>이후 구조화 폼 수기 등록</li>
            <li>로그인 사용자 간 전체 목록 공유</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="panel">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {metric.value}
            </p>
            <p className="mt-3 text-sm text-slate-600">{metric.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <article className="panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Recent Records</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                최근 업무 항목
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
              총 {stats.total}건
            </span>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 text-left text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">광고주</th>
                  <th className="px-4 py-3 font-medium">종류</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">처리일자</th>
                </tr>
              </thead>
              <tbody>
                {recentPermits.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 bg-white">
                    <td className="px-4 py-4">
                      <Link
                        href={`/permits/${item.id}`}
                        className="font-medium text-slate-950 hover:underline"
                      >
                        {item.advertiser}
                      </Link>
                      <div className="mt-1 text-sm text-slate-500">{item.place}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.kind}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          statusTone[item.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {item.processedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Quick Links</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            바로가기
          </h3>
          <div className="mt-6 space-y-3">
            <Link
              href="/permits/new"
              className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 hover:bg-slate-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Action 01
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">신규 허가/신고 등록</p>
            </Link>
            <Link
              href="/permits/upload"
              className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 hover:bg-slate-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Action 02
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">엑셀 일괄 업로드</p>
            </Link>
            <Link
              href="/permits"
              className="block rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 hover:bg-slate-100"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Action 03
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">전체 목록 보기</p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
