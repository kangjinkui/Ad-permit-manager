"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkDeletePermits } from "@/app/permits/actions";
import type { PermitWithStaff } from "@/lib/permits";

const statusTone: Record<string, string> = {
  소심의상정예정: "bg-violet-100 text-violet-700",
  연장고지서및안전점검의뢰: "bg-cyan-100 text-cyan-700",
  우편발송예정: "bg-amber-100 text-amber-800",
  보완요청: "bg-rose-100 text-rose-700",
  공문발송: "bg-sky-100 text-sky-700",
  접수: "bg-slate-100 text-slate-700",
  직접방문수령: "bg-emerald-100 text-emerald-700",
};

type Props = {
  permits: PermitWithStaff[];
  canDelete: boolean;
};

const PAGE_SIZE = 10;

export function PermitsTableClient({ permits, canDelete }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(permits.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagePermits = permits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allChecked = pagePermits.length > 0 && pagePermits.every((p) => selected.has(p.id));
  const someChecked = pagePermits.some((p) => selected.has(p.id)) && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected((prev) => {
        const next = new Set(prev);
        pagePermits.forEach((p) => next.delete(p.id));
        return next;
      });
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      pagePermits.forEach((p) => next.add(p.id));
      return next;
    });
  }

  function handlePageChange(p: number) {
    setPage(p);
    setSelected(new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const confirmed = confirm(
      `선택한 ${ids.length}건을 삭제하시겠습니까?\n이력까지 포함된 모든 데이터가 영구 삭제됩니다.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await bulkDeletePermits(ids);
      if (result?.error) {
        alert(`삭제 중 오류가 발생했습니다: ${result.error}`);
        return;
      }

      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      {canDelete && selected.size > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-slate-600">{selected.size}건 선택됨</span>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="rounded-[20px] bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isPending ? "삭제 중..." : "선택 삭제"}
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
              {canDelete && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">광고주</th>
              <th className="px-4 py-3 font-medium">종류/구분</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">안전점검</th>
              <th className="px-4 py-3 font-medium">담당자</th>
            </tr>
          </thead>
          <tbody>
            {pagePermits.length === 0 ? (
              <tr>
                <td
                  colSpan={canDelete ? 6 : 5}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  조건에 맞는 항목이 없습니다.
                </td>
              </tr>
            ) : (
              pagePermits.map((item) => (
                <tr
                  key={item.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "INPUT") return;
                    const qs = searchParams.toString();
                    const from = encodeURIComponent("/permits" + (qs ? "?" + qs : ""));
                    router.push(`/permits/${item.id}?from=${from}`);
                  }}
                  className="cursor-pointer border-t border-slate-200 bg-white hover:bg-slate-50"
                >
                  {canDelete && (
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-slate-800"
                      />
                    </td>
                  )}
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
                        statusTone[item.status.replace(/\s/g, "")] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.safetyCheck}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">{item.staffName ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, permits.length)} / 총 {permits.length}건
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-[8px] border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`rounded-[8px] border px-3 py-1.5 ${
                  p === currentPage
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-[8px] border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </>
  );
}
