import type { PermitWithStaff } from "./permits";
import manifest from "../../templates/review/manifest.json";

export type ReviewTemplateId = keyof typeof manifest.templates;
export const reviewTemplateVersion = manifest.version;
export const reviewStatuses = ["적합", "부적합", "확인필요", "해당없음"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

type ReviewField = {
  label: string;
  type?: "number" | "date" | "textarea" | "select";
  options?: readonly string[];
};

export const reviewFields = {
  applicant: { label: "광고주" },
  installationAddress: { label: "설치 장소", type: "textarea" },
  displayText: { label: "표시 내용", type: "textarea" },
  previousDisplayText: { label: "변경 전 표시 내용", type: "textarea" },
  specification: { label: "규격 (m)", type: "textarea" },
  quantity: { label: "수량", type: "number" },
  lighting: { label: "조명" },
  landUseZone: { label: "용도지역" },
  adOwner: { label: "광고 유형", type: "select", options: ["자사광고", "타사광고"] },
  floor: { label: "설치층" },
  buildingFloors: { label: "건물 전체 층수", type: "number" },
  wallPlacement: { label: "벽면 설치 구분", type: "select", options: ["일반", "상단"] },
  orientation: { label: "표시 방향", type: "select", options: ["가로형", "세로형"] },
  signShape: { label: "간판 형태", type: "select", options: ["판류형", "입체형", "기타"] },
  buildingHeightM: { label: "건물 높이 (m)", type: "number" },
  signHeightM: { label: "간판 전체 높이 (m)", type: "number" },
  rooftopDistanceM: { label: "옥상간판 간 수평거리 (m)", type: "number" },
  buildingWidthM: { label: "건물 가로폭 (m)", type: "number" },
  protrusionM: { label: "돌출폭 (m)", type: "number" },
  windowObstruction: { label: "창문 차폐", type: "select", options: ["차폐 없음", "차폐 있음", "확인필요"] },
  depthM: { label: "두께 (m)", type: "number" },
  clearanceM: { label: "지면 이격 (m)", type: "number" },
  sidewalk: { label: "보도 유무", type: "select", options: ["있음", "없음", "확인필요"] },
  roadOccupation: { label: "도로점용", type: "select", options: ["해당 없음", "해당", "확인필요"] },
  boundaryDistanceM: { label: "부지 경계 이격 (m)", type: "number" },
  walkwayObstruction: { label: "통행로 침범", type: "select", options: ["침범 없음", "침범 있음", "확인필요"] },
  faceAreaM2: { label: "1면 면적 (㎡)", type: "number" },
  totalAreaM2: { label: "합계 면적 (㎡)", type: "number" },
  permitNumberLabel: { label: "번호 종류", type: "select", options: ["허가번호", "신고번호"] },
  permitOrReportNo: { label: "기존 허가·신고번호" },
  periodBeforeFrom: { label: "기존 표시기간 시작", type: "date" },
  periodBeforeTo: { label: "기존 표시기간 종료", type: "date" },
  periodAfterFrom: { label: "연장 표시기간 시작", type: "date" },
  periodAfterTo: { label: "연장 표시기간 종료", type: "date" },
  safetyResult: { label: "안전점검 결과", type: "select", options: ["합격", "불합격", "대상아님", "확인필요"] },
  safetyDate: { label: "안전점검 일자", type: "date" },
  reviewOpinion: { label: "검토 의견", type: "textarea" },
  reviewer: { label: "작성자" },
} satisfies Record<string, ReviewField>;

export type ReviewFieldKey = keyof typeof reviewFields;
export type ReviewValues = Partial<Record<ReviewFieldKey, string>>;
type ReviewCheck = { appliedValue: string; status: ReviewStatus };
export type ReviewDraft = { fields: ReviewValues; checks: Record<string, ReviewCheck> };

const numberFields = ["permitNumberLabel", "permitOrReportNo", "periodBeforeFrom", "periodBeforeTo"] as const;
const renewalFields = [...numberFields, "periodAfterFrom", "periodAfterTo", "safetyResult", "safetyDate"] as const;
const wallFields = ["floor", "signShape", "protrusionM", "windowObstruction"] as const;
const projectingFields = ["floor", "buildingFloors", "signHeightM", "protrusionM", "depthM", "clearanceM", "sidewalk", "roadOccupation"] as const;
const topWallFields = ["buildingFloors", "orientation", "buildingWidthM", ...wallFields] as const;
const additionalFields: Record<ReviewTemplateId, readonly ReviewFieldKey[]> = {
  T01: [...numberFields, "previousDisplayText", "buildingFloors", "buildingHeightM", "signHeightM", "rooftopDistanceM"],
  T02: topWallFields,
  T03: topWallFields,
  T04: projectingFields,
  T05: topWallFields,
  T06: ["boundaryDistanceM", "walkwayObstruction", "signHeightM", "faceAreaM2", "totalAreaM2"],
  T07: wallFields,
  T08: [...renewalFields, ...wallFields, "orientation"],
  T09: [...renewalFields, ...projectingFields],
};

const commonFields = ["applicant", "installationAddress", "displayText", "specification", "quantity", "lighting", "landUseZone", "adOwner"] as const;
const baseRequiredFields = ["installationAddress", "displayText", "specification", "quantity", "reviewer"] as const;

export function getReviewFieldKeys(templateId: ReviewTemplateId | null): ReviewFieldKey[] {
  return [...commonFields, ...(templateId ? additionalFields[templateId] : []), "reviewOpinion", "reviewer"];
}

export function getReviewChecks(templateId: ReviewTemplateId, fields?: ReviewValues) {
  const checks = manifest.templates[templateId].checks;
  if (templateId !== "T08" || fields?.wallPlacement !== "상단") return checks;
  return checks.map((check) => check.key === "row6"
    ? { ...check, standardText: "○ 설치 위치와 표시 방향에 해당하는 상단간판 규격 기준 확인" }
    : check);
}

export function supportsPermitReview(kind: string, category: string): boolean {
  return (
    (kind === "옥상간판" && category === "내용변경") ||
    ((kind === "벽면이용간판" || kind === "돌출간판") && (category === "신규" || category === "연장")) ||
    (kind === "입간판" && category === "신규")
  );
}

export function selectReviewTemplate(kind: string, category: string, fields: ReviewValues): {
  templateId: ReviewTemplateId | null;
  error: string | null;
} {
  if (!supportsPermitReview(kind, category)) {
    return { templateId: null, error: "이 간판 종류와 신청 구분에 해당하는 검토서 서식이 없습니다." };
  }
  if (kind === "옥상간판") return { templateId: "T01", error: null };
  if (kind === "돌출간판") return { templateId: category === "연장" ? "T09" : "T04", error: null };
  if (kind === "입간판") return { templateId: "T06", error: null };
  if (category === "연장") return { templateId: "T08", error: null };
  if (fields.wallPlacement === "일반") return { templateId: "T07", error: null };
  if (fields.wallPlacement !== "상단") return { templateId: null, error: "벽면 설치 구분을 선택하세요." };

  const floors = Number(fields.buildingFloors);
  if (!Number.isInteger(floors) || floors < 1) return { templateId: null, error: "건물 전체 층수를 입력하세요." };
  if (fields.orientation !== "가로형" && fields.orientation !== "세로형") {
    return { templateId: null, error: "상단간판의 표시 방향을 선택하세요." };
  }
  if (floors <= 10) return { templateId: "T05", error: null };
  return { templateId: fields.orientation === "세로형" ? "T02" : "T03", error: null };
}

export function createReviewDraft(permit: PermitWithStaff, reviewer: string): ReviewDraft {
  const faceValues = (key: "place" | "content" | "lighting", fallback: string) => {
    const values = permit.signFaces?.map((face) => face[key] ?? fallback) ?? [];
    if (values.length === 0 || values.every((value) => value === values[0])) return values[0] ?? fallback;
    return values.map((value, index) => `${index + 1}면 ${value || "미입력"}`).join("\n");
  };
  const size = (width: number | null, height: number | null) =>
    width !== null && height !== null ? `${width} × ${height}` : "";
  const specification = permit.signFaces?.map((face) => size(face.width, face.height)) ?? [];

  return {
    fields: {
      applicant: permit.advertiser,
      installationAddress: faceValues("place", permit.place),
      displayText: faceValues("content", permit.content),
      specification: specification.some(Boolean)
        ? specification.map((value) => value || "미입력").join("\n")
        : size(permit.width, permit.height),
      quantity: permit.quantity > 0 ? String(permit.quantity) : "",
      lighting: faceValues("lighting", permit.lighting ?? ""),
      reviewOpinion: permit.reviewOpinion ?? "",
      reviewer,
    },
    checks: {},
  };
}

function object(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function calculateRenewalPeriods(start: string): Record<"periodBeforeTo" | "periodAfterFrom" | "periodAfterTo", string> {
  const empty = { periodBeforeTo: "", periodAfterFrom: "", periodAfterTo: "" };
  if (!isDate(start)) return empty;

  const renewalStart = new Date(`${start}T00:00:00Z`);
  // A February 29 anniversary falls on March 1 in a non-leap year.
  renewalStart.setUTCFullYear(renewalStart.getUTCFullYear() + 3);
  const priorEnd = new Date(renewalStart);
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1);
  const renewalEnd = new Date(renewalStart);
  renewalEnd.setUTCFullYear(renewalEnd.getUTCFullYear() + 3);
  renewalEnd.setUTCDate(renewalEnd.getUTCDate() - 1);
  if (renewalEnd.getUTCFullYear() > 9999) return empty;

  return {
    periodBeforeTo: priorEnd.toISOString().slice(0, 10),
    periodAfterFrom: renewalStart.toISOString().slice(0, 10),
    periodAfterTo: renewalEnd.toISOString().slice(0, 10),
  };
}

export function completeRenewalPeriods(fields: ReviewValues): ReviewValues {
  if (!fields.periodBeforeFrom || (fields.periodBeforeTo && fields.periodAfterFrom && fields.periodAfterTo)) return fields;
  const dates = calculateRenewalPeriods(fields.periodBeforeFrom);
  if (!dates.periodBeforeTo) return fields;
  return {
    ...fields,
    periodBeforeTo: fields.periodBeforeTo || dates.periodBeforeTo,
    periodAfterFrom: fields.periodAfterFrom || dates.periodAfterFrom,
    periodAfterTo: fields.periodAfterTo || dates.periodAfterTo,
  };
}

const wholeNumberFields: readonly ReviewFieldKey[] = ["quantity", "buildingFloors"];
const invalidXmlText = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u;

export function normalizeReviewDraft(value: unknown, kind: string, category: string):
  | { draft: ReviewDraft; templateId: ReviewTemplateId | null }
  | { error: string } {
  const draft = object(value);
  const inputFields = object(draft?.fields);
  const inputChecks = object(draft?.checks);
  if (!inputFields || !inputChecks) return { error: "검토서 입력 형식이 올바르지 않습니다." };

  let fields: ReviewValues = {};
  for (const key of Object.keys(inputFields)) {
    if (key === "businessWidthM") continue; // Older drafts may still contain this field.
    if (!Object.hasOwn(reviewFields, key)) return { error: "알 수 없는 검토서 입력 항목입니다." };
    const fieldKey = key as ReviewFieldKey;
    const field: ReviewField = reviewFields[fieldKey];
    const raw = inputFields[key];
    if (typeof raw !== "string" || raw.length > (field.type === "textarea" ? 4000 : 500) || invalidXmlText.test(raw)) {
      return { error: `${field.label} 입력을 확인하세요.` };
    }
    const text = raw.trim();
    if (!text) continue;
    if (field.options && !field.options.includes(text)) return { error: `${field.label} 선택을 확인하세요.` };
    if (field.type === "number") {
      const whole = wholeNumberFields.includes(fieldKey);
      const number = Number(text);
      if (!/^\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(number) || (whole && (!Number.isSafeInteger(number) || number < 1))) {
        return { error: `${field.label}에 올바른 수치를 입력하세요.` };
      }
    }
    if (field.type === "date" && !isDate(text)) return { error: `${field.label}에 올바른 날짜를 입력하세요.` };
    fields[fieldKey] = text;
  }

  if (category === "연장") fields = completeRenewalPeriods(fields);

  const before = fields.periodBeforeFrom && fields.periodBeforeTo && fields.periodBeforeFrom > fields.periodBeforeTo;
  const after = fields.periodAfterFrom && fields.periodAfterTo && fields.periodAfterFrom > fields.periodAfterTo;
  if (before || after) return { error: "표시기간 종료일은 시작일과 같거나 늦어야 합니다." };

  const { templateId } = selectReviewTemplate(kind, category, fields);
  const checkKeys = new Set(templateId ? getReviewChecks(templateId).map(({ key }) => key) : []);
  const checks: ReviewDraft["checks"] = {};
  for (const [key, value] of Object.entries(inputChecks)) {
    if (!checkKeys.has(key)) return { error: "선택한 서식의 점검 항목을 다시 확인하세요." };
    const check = object(value);
    const status = reviewStatuses.find((candidate) => candidate === check?.status);
    if (!status || typeof check?.appliedValue !== "string" ||
      check.appliedValue.length > 2000 || invalidXmlText.test(check.appliedValue)) {
      return { error: "점검표의 신청내용이나 판정을 확인하세요." };
    }
    checks[key] = { appliedValue: check.appliedValue.trim(), status };
  }
  return { draft: { fields, checks }, templateId };
}

export function getReviewDownloadError(templateId: ReviewTemplateId, fields: ReviewValues): string | null {
  const required: ReviewFieldKey[] = [...baseRequiredFields, "reviewOpinion"];
  if (templateId !== "T01") required.push("applicant");
  if (templateId === "T01") required.push(...numberFields, "previousDisplayText");
  if (templateId === "T08" || templateId === "T09") {
    required.push(...numberFields, "periodAfterFrom", "periodAfterTo");
    if (fields.safetyResult === "합격" || fields.safetyResult === "불합격") required.push("safetyDate");
  }
  const missing = required.filter((key) => !fields[key]);
  if (missing.length) return `검토서 출력에 필요한 항목을 입력하세요. (${missing.map((key) => reviewFields[key].label).join(", ")})`;
  if (fields.specification?.split(/\r?\n/).some((value) => value.trim() === "미입력")) {
    return "누락된 면의 규격을 입력하세요.";
  }
  return null;
}

function metric(label: string, value: string | undefined, unit = "m"): string {
  return value ? `${label} ${value}${unit}` : "";
}

export function getSuggestedCheckValue(templateId: ReviewTemplateId, key: string, fields: ReviewValues): string {
  const join = (...values: (string | undefined)[]) => values.filter(Boolean).join("\n");
  const specification = fields.specification;
  const quantity = metric("", fields.quantity, "개").trimStart();
  const floor = fields.floor && /^\d+$/.test(fields.floor) ? `${fields.floor}층` : fields.floor;
  const protrusion = metric("돌출폭", fields.protrusionM);
  const lighting = fields.lighting;
  const safety = join(fields.safetyResult, fields.safetyDate);
  let values: (string | undefined)[];

  switch (templateId) {
    case "T01":
      values = [join(fields.landUseZone, fields.adOwner), metric("건물", fields.buildingFloors, "층"),
        join(specification, metric("건물 높이", fields.buildingHeightM), metric("간판 높이", fields.signHeightM)),
        quantity, lighting, metric("수평거리", fields.rooftopDistanceM)];
      break;
    case "T04":
    case "T09":
      values = [fields.landUseZone, fields.adOwner,
        join(specification, protrusion, metric("세로 높이", fields.signHeightM), metric("두께", fields.depthM)),
        join(floor, metric("건물", fields.buildingFloors, "층")), quantity,
        join(metric("지면 이격", fields.clearanceM), fields.sidewalk && `보도 ${fields.sidewalk}`),
        lighting, fields.roadOccupation, safety];
      break;
    case "T06":
      values = [fields.landUseZone, fields.adOwner, metric("부지 경계 이격", fields.boundaryDistanceM), "입간판", quantity,
        join(specification, metric("전체 높이", fields.signHeightM), metric("1면", fields.faceAreaM2, "㎡"), metric("합계", fields.totalAreaM2, "㎡")),
        fields.walkwayObstruction, lighting];
      break;
    default: {
      const location = templateId === "T08" && fields.wallPlacement === "상단" ? floor || "건물 상단" : floor;
      const wallDimensions = join(specification, metric("건물 가로폭", fields.buildingWidthM));
      values = [fields.landUseZone, fields.adOwner, location, fields.signShape, quantity, wallDimensions,
        protrusion, lighting, fields.windowObstruction, safety];
      if (templateId === "T07") values.splice(6, 0, "");
    }
  }
  return values[Number(key.slice(3)) - 1] ?? "";
}
