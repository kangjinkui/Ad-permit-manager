import { notFound } from "next/navigation";
import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { getProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { getPermit, getPermitHistory } from "@/lib/permits";
import { permitStatuses, permitKinds, permitCategories } from "@/lib/mock-data";
import { updateStatus, updatePermit, updateNotes } from "./actions";
import { DeleteButton } from "./delete-button";

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
  const profile = await getProfile();

  const [permit, history] = await Promise.all([
    getPermit(id),
    getPermitHistory(id),
  ]);

  if (!permit) notFound();

  return (
    <main className="app-frame">
      <NavShell pathname="/permits" profile={profile} />
      <section className="flex flex-col gap-6">
        <AuthStatus email={profile?.email} envReady={envReady} />

        {/* 헤더 */}
        <div className="flex items-center gap-4">
          <Link href="/permits" className="text-sm text-slate-500 hover:text-slate-800">
            ← 목록
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-700">{permit.advertiser}</span>
        </div>

        {/* 상세 정보 편집 */}
        <form action={updatePermit}>
          <input type="hidden" name="permit_id" value={permit.id} />
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

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                광고주 *
                <input name="advertiser" className="field" defaultValue={permit.advertiser} required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                종류 *
                <select name="kind" className="field" defaultValue={permit.kind}>
                  {permitKinds.map((k) => <option key={k}>{k}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                구분 *
                <select name="category" className="field" defaultValue={permit.category}>
                  {permitCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                표시장소 *
                <input name="place" className="field" defaultValue={permit.place} required />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
                표시내용 *
                <input name="content" className="field" defaultValue={permit.content} required />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                수량
                <input name="quantity" type="number" min="1" className="field" defaultValue={permit.quantity} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                안전점검
                <select name="safety_check" className="field" defaultValue={permit.safetyCheck}>
                  <option value="확인필요">확인필요</option>
                  <option value="대상">대상</option>
                  <option value="대상아님">대상아님</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                연장대상
                <select name="renewal_target" className="field" defaultValue={permit.renewalTarget}>
                  <option value="연장대상 아님">연장대상 아님</option>
                  <option value="연장대상">연장대상</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                처리일자
                <input name="processed_at" type="date" className="field" defaultValue={permit.processedAt || ""} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                심의일자
                <input name="hearing_at" type="date" className="field" defaultValue={permit.hearingAt ?? ""} />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button type="submit" className="button-primary" disabled={!envReady}>
                저장
              </button>
            </div>
          </article>
        </form>

        {/* 메모 */}
        <form action={updateNotes}>
          <input type="hidden" name="permit_id" value={permit.id} />
          <article className="panel">
            <p className="eyebrow">Memo</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              메모
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              이 건에 대한 연락처, 이메일 등 담당자 메모를 자유롭게 작성하세요.
            </p>
            <textarea
              name="notes"
              className="field mt-4 min-h-[120px] w-full resize-y"
              placeholder="예) 담당자 이메일: example@company.com&#10;연락처: 010-0000-0000"
              defaultValue={permit.notes ?? ""}
            />
            <div className="mt-4">
              <button type="submit" className="button-primary" disabled={!envReady}>
                메모 저장
              </button>
            </div>
          </article>
        </form>

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

        {/* 삭제 — admin 전용 */}
        {profile?.role === "admin" && (
          <article className="panel flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Danger Zone</p>
              <p className="mt-2 text-sm text-slate-600">이 항목을 삭제하면 이력을 포함한 모든 데이터가 영구 삭제됩니다.</p>
            </div>
            <DeleteButton permitId={permit.id} advertiser={permit.advertiser} />
          </article>
        )}

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
