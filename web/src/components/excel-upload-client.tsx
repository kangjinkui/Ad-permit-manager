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

// 표준 서식 헤더 (다운로드 템플릿과 파서가 동일하게 사용)
const TEMPLATE_HEADERS = [
  "종류", "구분", "광고주", "표시장소", "표시내용",
  "수량", "상태", "처리일자", "심의일자", "안전점검", "연장대상",
] as const;

// 종류 오타 보정 맵
const KIND_NORMALIZE: Record<string, string> = {
  "반면이용간판": "벽면이용간판",
  "벽면간판": "벽면이용간판",
  "옥상간판2": "옥상간판",
};

function normalizeKind(v: string): string {
  return KIND_NORMALIZE[v] ?? v;
}

// 엑셀 행 → UploadRow 변환
function parseRow(rawRow: Record<string, unknown>): UploadRow | null {
  // 헤더 앞뒤 공백 정규화
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    row[k.trim()] = typeof v === "string" ? v.trim() : v;
  }

  const advertiser = String(row["광고주"] ?? "").trim();
  const kind = normalizeKind(String(row["종류"] ?? "").trim());
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
    hearingAt: serialToDateString((row["심의일자"] ?? row["소의심 날짜"]) as number | string | null),
    safetyCheck: normalizeSafetyCheck(row["안전점검"] as string),
    renewalTarget: normalizeRenewalTarget(row["연장대상"] as string),
  };
}

function downloadTemplate() {
  const sampleRow = [
    "벽면이용간판", "신규", "홍길동상회", "강남대로 123, 1층", "홍길동상회 간판",
    1, "접수", "2026-03-29", "", "대상아님", "연장대상 아님",
  ];

  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, sampleRow]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: h.length < 6 ? 14 : 24 }));

  // 선택값 안내 시트
  const infoHeaders = ["종류 선택값", "구분 선택값", "상태 선택값", "안전점검 선택값", "연장대상 선택값"];
  const infoRows = [
    ["벽면이용간판",          "신규",    "접수",                    "대상",   "연장대상"],
    ["돌출간판",              "연장",    "공문발송",                "대상아님","연장대상 아님"],
    ["입간판",                "내용변경","내용보완",                "확인필요",""],
    ["지주간판",              "",        "서울시심의 상정예정",     "",       ""],
    ["옥상간판",              "",        "소심의 상정예정",         "",       ""],
    ["공공시설물이용 광고물", "",        "우편발송예정",            "",       ""],
    ["교통수단이용 광고물",   "",        "이메일 발송완료",         "",       ""],
    ["",                      "",        "직접방문수령",            "",       ""],
    ["",                      "",        "본심의상정예정",          "",       ""],
    ["",                      "",        "연장고지서 및 안전점검의뢰", "",    ""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet([infoHeaders, ...infoRows]);
  ws2["!cols"] = infoHeaders.map(() => ({ wch: 28 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "허가신고목록");
  XLSX.utils.book_append_sheet(wb, ws2, "선택값 목록");
  XLSX.writeFile(wb, "허가신고_업로드_서식.xlsx");
}

export function ExcelUploadClient() {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [result, setResult] = useState<{ success?: boolean; error?: string; count?: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setDetectedHeaders([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
      if (json.length > 0) {
        setDetectedHeaders(Object.keys(json[0]));
      }
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
      {/* 서식 다운로드 */}
      <div className="panel flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Template</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            표준 서식 다운로드
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            아래 서식을 받아 작성한 뒤 업로드하세요. 선택값 목록 시트를 참고하세요.
          </p>
        </div>
        <button onClick={downloadTemplate} className="button-secondary shrink-0">
          서식 다운로드 (.xlsx)
        </button>
      </div>

      {/* 파일 선택 */}
      <div className="panel">
        <p className="eyebrow">File Select</p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          엑셀 파일 업로드
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          표준 서식으로 작성한 .xlsx 파일을 선택하면 미리보기가 나타납니다.
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

      {/* 파싱 실패 안내 */}
      {fileName && rows.length === 0 && detectedHeaders.length > 0 && !result ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
          <p className="font-semibold">파일에서 인식된 행이 없습니다.</p>
          <p className="mt-1">
            감지된 헤더: <span className="font-mono">{detectedHeaders.join(", ")}</span>
          </p>
          <p className="mt-2">
            필수 컬럼: <span className="font-mono">광고주, 종류, 구분, 표시장소, 표시내용, 상태</span>
          </p>
        </div>
      ) : null}

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
