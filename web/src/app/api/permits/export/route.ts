import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getProfile } from "@/lib/auth";
import { getPermits, type PermitFilters, type PermitWithStaff } from "@/lib/permits";
import { joinFaceValues } from "@/lib/sign-faces";

// 앞 11개 열은 엑셀 업로드 서식(TEMPLATE_HEADERS)과 동일한 순서·이름이라 그대로 재업로드 가능하다.
const HEADERS = [
  "종류", "구분", "광고주", "표시장소", "표시내용",
  "수량", "상태", "처리일자", "심의일자", "안전점검", "연장대상",
  "접수번호", "면수", "규격(가로×세로)", "조명",
  "허가수수료", "안전점검수수료", "담당자", "직급", "담당자 검토의견", "비고", "등록방식",
] as const;

function formatSize(width: number | null, height: number | null): string | null {
  if (width == null && height == null) return null;
  return `${width ?? "-"}×${height ?? "-"}`;
}

function toRow(p: PermitWithStaff): (string | number | null)[] {
  const faces = p.signFaces;
  return [
    p.kind,
    p.category,
    p.advertiser,
    joinFaceValues(faces, (f) => f.place) ?? p.place,
    joinFaceValues(faces, (f) => f.content) ?? p.content,
    p.quantity,
    p.status,
    p.processedAt || null,
    p.hearingAt,
    p.safetyCheck,
    p.renewalTarget,
    p.id,
    faces?.length ?? 1,
    joinFaceValues(faces, (f) => formatSize(f.width, f.height)) ?? formatSize(p.width, p.height),
    joinFaceValues(faces, (f) => f.lighting) ?? p.lighting,
    p.permitFee,
    p.safetyFee,
    p.staffName,
    p.staffTitle,
    p.reviewOpinion,
    p.notes,
    p.sourceType === "excel" ? "엑셀" : "수동",
  ];
}

export async function GET(request: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const filters: PermitFilters = {
    q: params.get("q") || undefined,
    status: params.get("status") || undefined,
    kind: params.get("kind") || undefined,
    category: params.get("category") || undefined,
    staffName: params.get("staffName") || undefined,
  };

  const permits = await getPermits(filters);

  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...permits.map(toRow)]);
  ws["!cols"] = HEADERS.map((h) =>
    ["표시장소", "표시내용", "담당자 검토의견", "비고"].includes(h) ? { wch: 32 } : { wch: 14 },
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "허가신고목록");
  const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const encodedFilename = encodeURIComponent(`허가신고목록_${today}.xlsx`);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "no-store",
    },
  });
}
