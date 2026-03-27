import { notFound } from "next/navigation";
import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { requireUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { getPermit, getPermitHistory } from "@/lib/permits";
import { permitStatuses } from "@/lib/mock-data";
import { updateStatus } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusTone: Record<string, string> = {
  직접방문수령: "bg-emerald-100 text-emerald-700",
  우편발송예정: "bg-amber-100 text-amber-800",
  내용보완: "bg-rose-100 text-rose-700",
  공문발송: "bg-sky-100 text-sky-700",
  "서울시심의 상정예정": "bg-violet-100 text-violet-700",
  이메일발송완료: "bg-cyan-100 text-cyan-700",
};

export default async function PermitDetailPage({ params }: PageProps) {
  const { id } = await params;
  const envReady = hasSupabaseEnv();
  const user = await requireUser();

  const [permit, history] = await Promise.all([
    getPermit(id),
    getPermitHistory(id),
  ]);

  if (!permit) notFound();

  const fields = [
    { label: "관리번호", value: permit.id },
    { label: "종류", value: permit.kind },
    { label: "구분", value: permit.category },
    { label: "광고주", value: permit.advertiser },
    { label: "표시장소", value: permit.place },
    { label: "표시내용", value: permit.content },
    { label: "수량", value: String(permit.quantity) },
    { label: "처리일자", value: permit.processedAt || "—" },
    { label: "심의일자", value: permit.hearingAt ?? "—" },
    { label: "안전점검", value: permit.safetyCheck },
    { label: "연장대상", value: permit.renewalTarget },
    { label: "원본", value: permit.sourceType },
  ];

  return (
    <main className="app-frame">
      <NavShell pathname="/permits" />
      <section className="flex flex-col gap-6">
        <AuthStatus email={user?.email} envReady={envReady} />

        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link href="/permits" className="text-sm text-slate-500 hover:text-slate-800">
            ← 목록
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-700">{permit.id}</span>
        </div>

        {/* 상세 정보 */}
        <article className="panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Permit Detail</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                {permit.advertiser}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{permit.place}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                statusTone[permit.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {permit.status}
            </span>
          </div>

          <dl className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map(({ label, value }) => (
              <div key={label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        {/* 상태 변경 */}
        <article className="panel">
          <p className="eyebrow">Status Update</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            상태 변경
          </h3>
          <form action={updateStatus} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="permit_id" value={permit.id} />
            <select name="new_status" className="field" defaultValue={permit.status}>
              {permitStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              name="note"
              className="field"
              placeholder="변경 사유 (선택)"
            />
            <button type="submit" className="button-primary" disabled={!envReady}>
              변경
            </button>
          </form>
        </article>

        {/* 이력 타임라인 */}
        <article className="panel">
          <p className="eyebrow">History</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            상태 변경 이력
          </h3>
          {history.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">변경 이력이 없습니다.</p>
          ) : (
            <ol className="mt-6 space-y-3">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex gap-4 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {h.fromStatus ? (
                        <>
                          <span className="text-slate-500">{h.fromStatus}</span>
                          {" → "}
                          <span>{h.toStatus}</span>
                        </>
                      ) : (
                        <span>최초 등록: {h.toStatus}</span>
                      )}
                    </p>
                    {h.note ? (
                      <p className="mt-1 text-sm text-slate-500">{h.note}</p>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {new Date(h.changedAt).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </main>
  );
}
