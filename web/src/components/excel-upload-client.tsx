"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { bulkCreatePermits, type UploadRow } from "@/app/permits/upload/actions";

// Excel 시리얼 날짜 → 'YYYY-MM-DD' 문자열
function serialToDateString(serial: number | string | null | undefined): string | null {
  if (!serial) return null;
  if (typeof serial === "string") return serial.slice(0, 10) || null;
  // Excel 시리얼: 1900-01-01 기준, 60번(윤년 버그) 보정
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().slice(0, 10);
}

// 안전점검 값 정규화
function normalizeSafetyCheck(v: string | null | undefined): string {
  if (!v) return "확인필요";
  const s = String(v).trim();
  if (s.includes("대상아님") || s.includes("대상 아님")) return "대상아님";
  if (s.includes("대상")) return "대상";
  return "확인필요";
}

// 연장대상 값 정규화
function normalizeRenewalTarget(v: string | null | undefined): string {
  if (!v) return "연장대상 아님";
  const s = String(v).trim();
  if (s.includes("아님")) return "연장대상 아님";
  if (s.includes("연장대상")) return "연장대상";
  return "연장대상 아님";
}

// 엑셀 행 → UploadRow 변환 (샘플 파일 컬럼 기준)
// 헤더: 연번, 종류, 구분, 광고주, 표시장소, 표시내용, 규격, 수량, 상태, 처리일자, 소의심 날짜, 안전점검, 연장대상
function parseRow(row: Record<string, unknown>): UploadRow | null {
  const advertiser = String(row["광고주"] ?? "").trim();
  const kind = String(row["종류"] ?? "").trim();
  const category = String(row["구분"] ?? "").trim();
  const place = String(row["표시장소"] ?? "").trim();
  const content = String(row["표시내용"] ?? "").trim();
  const status = String(row["상태"] ?? "").trim();

  if (!advertiser || !kind || !category || !place || !content || !status) return null;

  return {
    kind,
    category,
    advertiser,
    place,
    content,
    quantity: Number(row["수량"]) || 1,
    status,
    processedAt: serialToDateString(row["처리일자"] as number | string | null),
    hearingAt: serialToDateString(row["소의심 날짜"] as number | string | null),
    safetyCheck: normalizeSafetyCheck(row["안전점검 "] as string),
    renewalTarget: normalizeRenewalTarget(row["연장대상  "] as string),
  };
}

export function ExcelUploadClient() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ success?: boolean; error?: string; count?: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      const parsed = json.flatMap((row) => {
        const r = parseRow(row);
        return r ? [r] : [];
      });
      setRows(parsed);
    };
    reader.readAsBinaryString(file);
  }

  function handleSave() {
    startTransition(async () => {
      const res = await bulkCreatePermits(rows);
      setResult(res ?? { error: "알 수 없는 오류" });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 파일 선택 */}
      <div className="panel">
        <p className="eyebrow">File Select</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          엑셀 파일 선택
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          .xlsx / .xls 파일을 선택하면 미리보기가 나타납니다. 헤더 행이 있는 형식만 지원합니다.
        </p>
        <label className="mt-6 flex cursor-pointer flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-slate-300 px-6 py-10 hover:border-slate-400">
          <span className="text-sm text-slate-500">
            {fileName ? fileName : "클릭하여 파일 선택"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={handleFile}
          />
          <span className="button-secondary text-sm">파일 선택</span>
        </label>
      </div>

      {/* 결과 메시지 */}
      {result ? (
        <div
          className={
            result.error
              ? "rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 whitespace-pre-line"
              : "rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
          }
        >
          {result.error ?? `${result.count}건 저장 완료. 목록에서 확인하세요.`}
        </div>
      ) : null}

      {/* 미리보기 */}
      {rows.length > 0 && !result?.success ? (
        <div className="panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Preview</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                미리보기 ({rows.length}건)
              </h3>
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="button-primary disabled:opacity-60"
            >
              {isPending ? "저장 중…" : "전체 저장"}
            </button>
          </div>

          <div className="mt-6 overflow-auto rounded-[24px] border border-slate-200">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  {["#", "광고주", "종류/구분", "상태", "처리일자", "심의일자", "안전점검"].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-3 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{row.advertiser}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {row.kind} / {row.category}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.status}</td>
                    <td className="px-3 py-3 text-slate-700">{row.processedAt ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-700">{row.hearingAt ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-700">{row.safetyCheck}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
