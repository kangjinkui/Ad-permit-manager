"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PermitWithStaff } from "@/lib/permits";
import { bulkDeletePermits } from "@/app/permits/actions";

const statusTone: Record<string, string> = {
  직접방문수령: "bg-emerald-100 text-emerald-700",
  우편발송예정: "bg-amber-100 text-amber-800",
  내용보완: "bg-rose-100 text-rose-700",
  공문발송: "bg-sky-100 text-sky-700",
  "서울시심의 상정예정": "bg-violet-100 text-violet-700",
  이메일발송완료: "bg-cyan-100 text-cyan-700",
  접수: "bg-slate-100 text-slate-700",
};

type Props = {
  permits: PermitWithStaff[];
  isAdmin: boolean;
};

export function PermitsTableClient({ permits, isAdmin }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allChecked = permits.length > 0 && selected.size === permits.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(permits.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`선택한 ${ids.length}건을 삭제하시겠습니까?\n이력을 포함한 모든 데이터가 영구 삭제됩니다.`)) return;

    startTransition(async () => {
      const result = await bulkDeletePermits(ids);
      if (result?.error) {
        alert("삭제 중 오류가 발생했습니다: " + result.error);
      } else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <>
      {isAdmin && selected.size > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-slate-600">{selected.size}건 선택됨</span>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-[20px] bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? "삭제 중…" : "선택 삭제"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-[20px] border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            선택 해제
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 text-left text-sm text-slate-500">
            <tr>
              {isAdmin && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">관리번호</th>
              <th className="px-4 py-3 font-medium">광고주</th>
              <th className="px-4 py-3 font-medium">종류/구분</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">안전점검</th>
              <th className="px-4 py-3 font-medium">담당자</th>
              <th className="px-4 py-3 font-medium">원본</th>
            </tr>
          </thead>
          <tbody>
            {permits.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 8 : 7}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  조건에 맞는 항목이 없습니다.
                </td>
              </tr>
            ) : (
              permits.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "INPUT") return;
                    router.push(`/permits/${item.id}`);
                  }}
                  className="border-t border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  {isAdmin && (
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                      />
                    </td>
                  )}
                  <td className="px-4 py-4 text-sm font-medium text-slate-950">
                    {item.id}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-slate-950">{item.advertiser}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.place}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {item.kind} / {item.category}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        statusTone[item.status] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.safetyCheck}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.staffName ?? "-"}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.sourceType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
