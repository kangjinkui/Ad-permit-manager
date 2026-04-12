"use client";

import { useState } from "react";
import type { PermitWithStaff } from "@/lib/permits";

type Props = {
  permits: PermitWithStaff[];
  envReady: boolean;
};

type DownloadResult = {
  id: string;
  advertiser: string;
  filename: string;
  blobUrl: string;
  ok: true;
} | {
  id: string;
  advertiser: string;
  ok: false;
  msg: string;
};

export function DeliberationClient({ permits, envReady }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [committeeNo, setCommitteeNo] = useState<string>("");
  const [hearingDate, setHearingDate] = useState<string>(today);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<DownloadResult[]>([]);

  const allIds = permits.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function fetchOne(permit: PermitWithStaff): Promise<DownloadResult> {
    try {
      const res = await fetch("/api/deliberation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permitId: permit.id,
          committeeNo: Number(committeeNo),
          hearingDate: hearingDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { id: permit.id, advertiser: permit.advertiser, ok: false, msg: data.error ?? "생성 오류" };
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename = `소심의의결서_${permit.advertiser}.hwpx`;

      // 자동 다운로드
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      return { id: permit.id, advertiser: permit.advertiser, filename, blobUrl, ok: true };
    } catch {
      return { id: permit.id, advertiser: permit.advertiser, ok: false, msg: "네트워크 오류" };
    }
  }

  async function handleGenerate() {
    if (!someSelected || !committeeNo || isNaN(Number(committeeNo))) return;

    // 이전 결과의 blob URL 해제
    results.forEach((r) => { if (r.ok) URL.revokeObjectURL(r.blobUrl); });
    setResults([]);
    setLoading(true);

    const targets = permits.filter((p) => selectedIds.has(p.id));
    const total = targets.length;
    const collected: DownloadResult[] = [];

    for (let i = 0; i < targets.length; i++) {
      setProgress({ done: i, total });
      const result = await fetchOne(targets[i]);
      collected.push(result);
      setResults([...collected]);
      if (i < targets.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    setProgress({ done: total, total });
    setLoading(false);
    setTimeout(() => setProgress(null), 2000);
  }

  const successResults = results.filter((r) => r.ok) as Extract<DownloadResult, { ok: true }>[];
  const failResults = results.filter((r) => !r.ok) as Extract<DownloadResult, { ok: false }>[];

  return (
    <article className="panel">
      <p className="eyebrow">Document Generation</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        소심의 의결서 생성
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        &ldquo;소심의 상정예정&rdquo; 상태의 허가 건을 선택하여 의결서 HWPX 파일을 생성합니다.
      </p>

      {/* 공통 입력 */}
      <div className="mt-6 flex flex-wrap gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          위원회 차수 *
          <input
            type="number"
            min="1"
            className="field w-32"
            placeholder="예: 12"
            value={committeeNo}
            onChange={(e) => setCommitteeNo(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          심의 일자
          <input
            type="date"
            className="field"
            value={hearingDate}
            onChange={(e) => setHearingDate(e.target.value)}
          />
          <span className="text-xs text-slate-400">
            ※ 비워두면 각 허가 건의 심의일자를 사용합니다.
          </span>
        </label>
      </div>

      {/* 허가 목록 */}
      <div className="mt-6">
        {permits.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            &ldquo;소심의 상정예정&rdquo; 상태의 허가 건이 없습니다.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                {someSelected ? `${selectedIds.size}건 선택됨` : "생성할 허가 건을 선택하세요"}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-sky-600 hover:underline"
              >
                {allSelected ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 accent-sky-500"
                      />
                    </th>
                    <th className="px-4 py-3">광고주</th>
                    <th className="px-4 py-3">종류</th>
                    <th className="px-4 py-3">표시장소</th>
                    <th className="px-4 py-3">심의일자</th>
                    <th className="px-4 py-3">규격 (가로×세로)</th>
                    <th className="px-4 py-3">조명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permits.map((permit) => {
                    const isSelected = selectedIds.has(permit.id);
                    return (
                      <tr
                        key={permit.id}
                        className={`cursor-pointer transition ${isSelected ? "bg-sky-50" : "hover:bg-slate-50"}`}
                        onClick={() => toggleOne(permit.id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(permit.id)}
                            className="h-4 w-4 accent-sky-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{permit.advertiser}</td>
                        <td className="px-4 py-3 text-slate-600">{permit.kind}</td>
                        <td className="px-4 py-3 text-slate-600">{permit.place}</td>
                        <td className="px-4 py-3 text-slate-600">{permit.hearingAt ?? "—"}</td>
                        <td className="px-4 py-3">
                          {permit.width != null && permit.height != null ? (
                            <span className="text-slate-700">{permit.width}M × {permit.height}M</span>
                          ) : (
                            <span className="text-amber-600 text-xs">미입력</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {permit.lighting ?? <span className="text-amber-600 text-xs">미입력</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 생성 버튼 */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!envReady || loading || !someSelected || !committeeNo}
          className="button-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && progress
            ? `생성 중… (${progress.done + 1}/${progress.total})`
            : `의결서 생성${someSelected ? ` (${selectedIds.size}건)` : ""}`}
        </button>
        {progress && progress.done === progress.total && !loading && (
          <span className="text-sm text-emerald-600 font-medium">완료!</span>
        )}
      </div>

      {/* 생성 결과 */}
      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          {/* 성공 목록 */}
          {successResults.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-2 text-sm font-semibold text-emerald-700">
                다운로드 완료 ({successResults.length}건) — 브라우저 다운로드 폴더를 확인하세요
              </p>
              <ul className="space-y-1">
                {successResults.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-emerald-800">✓ {r.advertiser}</span>
                    <a
                      href={r.blobUrl}
                      download={r.filename}
                      className="text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
                    >
                      다시 다운로드
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 실패 목록 */}
          {failResults.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="mb-2 text-sm font-semibold text-rose-700">
                생성 실패 ({failResults.length}건)
              </p>
              <ul className="space-y-1">
                {failResults.map((r) => (
                  <li key={r.id} className="text-sm text-rose-700">
                    ✗ {r.advertiser} — {r.msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
