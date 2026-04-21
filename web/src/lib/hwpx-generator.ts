import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";
import type { PermitWithStaff } from "@/lib/permits";
import type { PermitKind } from "@/lib/mock-data";

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "deliberation_template.hwpx");

// 광고물 종류 → 현황 체크 셀 인덱스 (1-based, split on '<hp:tc ')
// 14=벽면, 15=돌출, 16=현수기, 17=옥상, 18=기타
const KIND_TO_CHECK_CELL: Record<PermitKind, number> = {
  "벽면이용간판": 14,
  "돌출간판": 15,
  "입간판": 18,
  "지주간판": 18,
  "옥상간판": 17,
  "공공시설물이용 광고물": 18,
  "교통수단이용 광고물": 18,
};

function formatDate(dateStr: string | null): { year: string; month: string; day: string } {
  if (!dateStr) {
    const now = new Date();
    return {
      year: String(now.getFullYear()),
      month: String(now.getMonth() + 1),
      day: String(now.getDate()),
    };
  }
  const [year, month, day] = dateStr.split("-");
  return { year, month: String(parseInt(month)), day: String(parseInt(day)) };
}

// 빈 데이터 셀에 텍스트 삽입: <hp:run charPrIDRef="N"/> → <hp:run charPrIDRef="N"><hp:t>TEXT</hp:t></hp:run>
function insertTextIntoEmptyCell(cellXml: string, text: string): string {
  // self-closing <hp:run charPrIDRef="N"/> 패턴을 찾아 텍스트 삽입
  return cellXml.replace(
    /(<hp:run charPrIDRef="[^"]+"\/>)/,
    (match) => {
      const pr = match.slice(0, -2); // 닫는 '/>' 제거
      return `${pr}><hp:t>${escapeXml(text)}</hp:t></hp:run>`;
    }
  );
}

// 체크 셀에 ○ 삽입: <hp:t/> → <hp:t>○</hp:t>
function markCheckCell(cellXml: string): string {
  return cellXml.replace(/<hp:t\/>/, "<hp:t>○</hp:t>");
}

// 체크 셀에서 ○ 제거: <hp:t>○</hp:t> → <hp:t/>
function unmarkCheckCell(cellXml: string): string {
  return cellXml.replace(/<hp:t>○<\/hp:t>/, "<hp:t/>");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateDeliberationHwpx(
  permit: PermitWithStaff,
  committeeNo: number,
  hearingDateOverride?: string | null,
): Promise<Buffer> {
  // 템플릿 읽기
  const templateBuffer = await fs.readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(templateBuffer);

  // section0.xml 수정
  const sectionFile = zip.file("Contents/section0.xml");
  if (!sectionFile) throw new Error("section0.xml not found in HWPX template");

  let xml = await sectionFile.async("string");

  // ── 1. 제목 차수 교체 ─────────────────────────────────────────────
  xml = xml.replace(
    /제12차 강남구 옥외광고심의위원회 소심의 의결서/,
    `제${committeeNo}차 강남구 옥외광고심의위원회 소심의 의결서`
  );

  // ── 2. 헤더 심의일자 교체 ─────────────────────────────────────────
  const { year, month, day } = formatDate(hearingDateOverride ?? permit.hearingAt);
  xml = xml.replace(
    /<hp:t>심의 일자: 2026<\/hp:t>/,
    `<hp:t>심의 일자: ${year}</hp:t>`
  );
  // '. 3. 17.' 패턴 (헤더 날짜 두 번째 부분)
  xml = xml.replace(
    /(<hp:t>)\. \d+\. \d+\.(<\/hp:t>)/,
    `$1. ${month}. ${day}.$2`
  );

  // ── 3. 셀 단위 치환 ──────────────────────────────────────────────
  const SEPARATOR = "<hp:tc ";
  const parts = xml.split(SEPARATOR);
  // parts[0] = 테이블 이전 내용, parts[1..] = 각 셀

  // 셀 3: 광고물 위치 (셀 2는 레이아웃용 빈 셀)
  parts[3] = insertTextIntoEmptyCell(parts[3], permit.place);

  // 셀 7: 광고주 성명
  parts[7] = insertTextIntoEmptyCell(parts[7], permit.advertiser);

  // 셀 14-18: 광고물 현황 체크
  const checkCellIndex = KIND_TO_CHECK_CELL[permit.kind] ?? 18;
  for (const idx of [14, 15, 16, 17]) {
    if (idx === checkCellIndex) {
      parts[idx] = markCheckCell(parts[idx]);
    }
    // 14-17은 기본이 빈 셀 (<hp:t/>) 이므로 따로 unmark 불필요
  }
  // 셀 18 (기타)은 기본이 ○이므로 해당 아닌 경우 제거
  if (checkCellIndex === 18) {
    // 이미 ○가 있으므로 그대로 유지
  } else {
    parts[18] = unmarkCheckCell(parts[18]);
  }

  // 셀 20: 상호
  parts[20] = insertTextIntoEmptyCell(parts[20], permit.advertiser);

  // 셀 22: 광고물 종류
  parts[22] = insertTextIntoEmptyCell(parts[22], permit.kind);

  // 셀 24: 광고 내용
  parts[24] = insertTextIntoEmptyCell(parts[24], permit.content);

  // 셀 26: 광고물 규격
  const widthStr = String(permit.width ?? "?");
  const heightStr = String(permit.height ?? "?");
  parts[26] = parts[26].replace(
    /<hp:t>가로\([^)]+\)\*세로\([^)]+\)<\/hp:t>/,
    `<hp:t>가로(${widthStr}M)*세로(${heightStr}M)</hp:t>`
  );

  // 셀 28: 조명
  if (permit.lighting) {
    parts[28] = parts[28].replace(
      /<hp:t>내부조명<\/hp:t>/,
      `<hp:t>${escapeXml(permit.lighting)}</hp:t>`
    );
  }

  // 셀 33: 담당자 검토의견
  if (permit.reviewOpinion) {
    parts[33] = insertTextIntoEmptyCell(parts[33], permit.reviewOpinion);
  }

  // 셀 30: 직급 및 담당자명 치환 ("직급 사무 6급" → staffTitle, "○○○" → staffName)
  if (permit.staffTitle) {
    parts[30] = parts[30].replace(/직급 사무 6급/g, escapeXml(permit.staffTitle));
  } else {
    parts[30] = parts[30].replace(/직급 사무 6급/g, "");
  }
  if (permit.staffName) {
    parts[30] = parts[30].replace(/○○○/g, escapeXml(permit.staffName));
  }

  // 셀 60: 마지막 날짜 (템플릿에서 날짜가 별도 <hp:t>로 분리되어 있음)
  parts[60] = parts[60].replace(
    /(<hp:t>)\d{4}\. \d+\. \d+\.(<\/hp:t>)/,
    `$1${year}. ${month}. ${day}.$2`
  );

  xml = parts.join(SEPARATOR);

  // ── 4. 수정된 XML 다시 ZIP에 삽입 ────────────────────────────────
  zip.file("Contents/section0.xml", xml);

  const outputBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return outputBuffer;
}
