export type FeeSignType =
  | "wall_general"
  | "wall_large"
  | "projection_general"
  | "pylon_general"
  | "public_facility_general"
  | "rooftop_large"
  | "banner_frame_general";

export type IlluminationType = "비조명" | "내부조명" | "외부조명";
export type AdOwnerType = "자사광고" | "타사광고";
export type ShapeType = "판류형" | "입체형";

export type FeeContext = {
  category?: string | null;
  safetyCheck?: string | null;
};

export type PublicFacilityFaceInput = {
  width: number;
  height: number;
  illuminationType: IlluminationType;
};

export type RooftopFaceInput = {
  width: number;
  panelHeight: number;
  extraHeightForSafety: number;
  illuminationType: IlluminationType;
};

export type WallGeneralFeeInput = {
  signType: "wall_general";
  shapeType: ShapeType;
  width: number;
  height: number;
  adOwnerType: AdOwnerType;
  illuminationType: IlluminationType;
};

export type WallLargeFeeInput = {
  signType: "wall_large";
  width: number;
  height: number;
  adOwnerType: AdOwnerType;
  permitIlluminationType: IlluminationType;
  safetyIlluminationType: IlluminationType;
};

export type BannerFrameFeeInput = {
  signType: "banner_frame_general";
  width: number;
  height: number;
  adOwnerType: AdOwnerType;
  illuminationType: IlluminationType;
};

export type ProjectionFeeInput = {
  signType: "projection_general";
  width: number;
  height: number;
  faceCount: number;
  illuminationType: IlluminationType;
};

export type PylonFeeInput = {
  signType: "pylon_general";
  width: number;
  height: number;
  faceCount: number;
  illuminationType: IlluminationType;
};

export type PublicFacilityFeeInput = {
  signType: "public_facility_general";
  faces: PublicFacilityFaceInput[];
};

export type RooftopFeeInput = {
  signType: "rooftop_large";
  faces: RooftopFaceInput[];
};

export type FeeCalculationInput =
  | WallGeneralFeeInput
  | WallLargeFeeInput
  | BannerFrameFeeInput
  | ProjectionFeeInput
  | PylonFeeInput
  | PublicFacilityFeeInput
  | RooftopFeeInput;

export type FeeCalculationResult = {
  permitFee: number | null;
  changeFee: number | null;
  safetyFee: number | null;
  totalFee: number | null;
  appliedPermitFee: number | null;
  appliedSafetyFee: number | null;
  appliedTotalFee: number | null;
  canApplyToPermit: boolean;
  errors: string[];
  warnings: string[];
};

export type FeeSignTypeOption = {
  value: FeeSignType;
  label: string;
  description: string;
};

export const feeSignTypeOptions: FeeSignTypeOption[] = [
  { value: "wall_general", label: "일반 벽면이용광고물", description: "판류형/입체형 벽면 간판 허가·안전점검 수수료" },
  { value: "wall_large", label: "대형 벽면이용광고물", description: "대형 벽면 광고물 허가·내용변경·안전점검 수수료" },
  { value: "projection_general", label: "일반 돌출간판", description: "돌출간판 허가·안전점검 수수료" },
  { value: "pylon_general", label: "일반 지주이용광고물", description: "지주이용광고물 허가·안전점검 수수료" },
  { value: "public_facility_general", label: "공공시설이용광고물", description: "면별 조명 비중을 반영한 허가·안전점검 수수료" },
  { value: "rooftop_large", label: "대형 옥상간판", description: "면별 높이와 조명 비중을 반영한 허가·내용변경·안전점검 수수료" },
  { value: "banner_frame_general", label: "일반간판(현수막게시틀)", description: "현수막게시틀 허가·안전점검 수수료" },
];

const CATEGORY_NEW = "신규";
const CATEGORY_CHANGE = "내용변경";
const SAFETY_TARGET = "대상";
const SAFETY_EXCLUDED = "대상아님";
const SAFETY_UNKNOWN = "확인필요";

export function createDefaultFeeInput(signType: FeeSignType): FeeCalculationInput {
  switch (signType) {
    case "wall_general":
      return { signType, shapeType: "판류형", width: 0, height: 0, adOwnerType: "자사광고", illuminationType: "비조명" };
    case "wall_large":
      return { signType, width: 0, height: 0, adOwnerType: "자사광고", permitIlluminationType: "비조명", safetyIlluminationType: "비조명" };
    case "banner_frame_general":
      return { signType, width: 0, height: 0, adOwnerType: "자사광고", illuminationType: "비조명" };
    case "projection_general":
      return { signType, width: 0, height: 0, faceCount: 1, illuminationType: "비조명" };
    case "pylon_general":
      return { signType, width: 0, height: 0, faceCount: 1, illuminationType: "비조명" };
    case "public_facility_general":
      return { signType, faces: [{ width: 0, height: 0, illuminationType: "비조명" }, { width: 0, height: 0, illuminationType: "비조명" }] };
    case "rooftop_large":
      return { signType, faces: [{ width: 0, panelHeight: 0, extraHeightForSafety: 0, illuminationType: "비조명" }] };
  }
}

export function getFeeSignTypeLabel(signType: FeeSignType): string {
  return feeSignTypeOptions.find((option) => option.value === signType)?.label ?? signType;
}

export function getSupportedFeeSignTypesForPermitKind(kind: string): FeeSignType[] {
  if (kind.includes("벽면")) return ["wall_general", "wall_large"];
  if (kind.includes("돌출")) return ["projection_general"];
  if (kind.includes("지주")) return ["pylon_general"];
  if (kind.includes("공공시설")) return ["public_facility_general"];
  if (kind.includes("옥상")) return ["rooftop_large"];
  if (kind.includes("현수막게시틀")) return ["banner_frame_general"];
  return [];
}

export function isFeeSignTypeCompatible(kind: string, signType: FeeSignType): boolean {
  return getSupportedFeeSignTypesForPermitKind(kind).includes(signType);
}

function normalizeCategory(category?: string | null): string | null {
  if (!category) return null;
  return category.replace(/\s+/g, "");
}

function normalizeSafetyCheck(safetyCheck?: string | null): string | null {
  if (!safetyCheck) return null;
  return safetyCheck.replace(/\s+/g, "");
}

function isChangeCategory(category?: string | null): boolean {
  return normalizeCategory(category) === CATEGORY_CHANGE;
}

function isExcludedSafetyCheck(safetyCheck?: string | null): boolean {
  return normalizeSafetyCheck(safetyCheck) === SAFETY_EXCLUDED;
}

function isUnknownSafetyCheck(safetyCheck?: string | null): boolean {
  return normalizeSafetyCheck(safetyCheck) === SAFETY_UNKNOWN;
}

function isTargetSafetyCheck(safetyCheck?: string | null): boolean {
  const normalized = normalizeSafetyCheck(safetyCheck);
  return normalized === null || normalized === SAFETY_TARGET;
}

function roundToInteger(value: number): number {
  return Math.round(value);
}

function roundDownToThousand(value: number): number {
  return Math.floor(value / 1000) * 1000;
}

function lightingMultiplier(type: IlluminationType): number {
  if (type === "내부조명") return 1.5;
  if (type === "외부조명") return 2;
  return 1;
}

function safeRoundArea(value: number): number {
  return roundToInteger(value);
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function hasPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function hasNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function getWallPermitBaseFee(area: number, adOwnerType: AdOwnerType): number {
  if (adOwnerType === "자사광고") return area <= 5 ? 4000 : 4000 + (area - 5) * 1500;
  return area <= 5 ? 40000 : 40000 + (area - 5) * 2000;
}

function getWallSafetyBaseFee(area: number): number {
  if (area <= 5) return 18000;
  if (area <= 20) return 26000;
  return 26000 + (area - 20) * 1500;
}

function getBannerFrameSafetyBaseFee(area: number): number {
  if (area <= 40) return 22000;
  if (area <= 80) return 45000;
  return 45000 + (area - 80) * 2000;
}

function getProjectionPermitBaseFee(area: number): number {
  return area <= 5 ? 20000 : 20000 + (area - 5) * 2000;
}

function getProjectionSafetyBaseFee(area: number): number {
  if (area <= 3.5) return 18000;
  if (area <= 10) return 26000;
  return 26000 + (area - 10) * 1500;
}

function getPylonPermitBaseFee(area: number): number {
  return area <= 10 ? 20000 : 20000 + (area - 10) * 2000;
}

function getAreaBasedSafetyBaseFee(area: number): number {
  if (area <= 10) return 18000;
  if (area <= 20) return 26000;
  return 26000 + (area - 20) * 1500;
}

function getPublicFacilityPermitBaseFee(totalArea: number): number {
  return 3000 + (totalArea - 1) * 1000;
}

function getRooftopPermitBaseFee(totalArea: number): number {
  return 40000 + (totalArea - 10) * 6000;
}

function getRooftopSafetyBaseFee(totalArea: number): number {
  if (totalArea <= 20) return 22000;
  if (totalArea <= 40) return 45000;
  return 45000 + (totalArea - 40) * 3000;
}

function applyLightingFee(baseFee: number, illuminationType: IlluminationType): number {
  return roundDownToThousand(baseFee * lightingMultiplier(illuminationType));
}

function applySafetySurcharge(value: number): number {
  return roundToInteger(value * 1.1);
}

function applyWeightedLightingFee(baseFee: number, totalArea: number, internalArea: number, externalArea: number): number {
  if (totalArea <= 0) return 0;
  const weighted = baseFee * (1 + (internalArea / totalArea) * 0.5 + externalArea / totalArea);
  return roundDownToThousand(weighted);
}

// 내용변경 허가수수료는 종류와 무관하게 허가수수료의 1/2 (천원 단위 절사)
function deriveChangeFee(permitFee: number | null): number | null {
  return permitFee === null ? null : roundDownToThousand(permitFee / 2);
}

function buildResult(
  permitFee: number | null,
  safetyFee: number | null,
  context: FeeContext,
  errors: string[] = [],
  warnings: string[] = [],
): FeeCalculationResult {
  if (errors.length > 0) {
    return { permitFee: null, changeFee: null, safetyFee: null, totalFee: null, appliedPermitFee: null, appliedSafetyFee: null, appliedTotalFee: null, canApplyToPermit: false, errors, warnings };
  }

  const changeFee = deriveChangeFee(permitFee);
  const totalFee = permitFee !== null || safetyFee !== null ? (permitFee ?? 0) + (safetyFee ?? 0) : null;
  const appliedPermitFee = isChangeCategory(context.category) ? changeFee : permitFee;
  let appliedSafetyFee: number | null = safetyFee;
  let canApplyToPermit = true;

  if (isExcludedSafetyCheck(context.safetyCheck)) appliedSafetyFee = null;
  else if (isUnknownSafetyCheck(context.safetyCheck)) {
    appliedSafetyFee = null;
    canApplyToPermit = false;
    warnings = [...warnings, "안전점검 상태가 '확인필요'라 permit 반영은 차단됩니다."];
  } else if (!isTargetSafetyCheck(context.safetyCheck)) {
    appliedSafetyFee = null;
  }

  // 허가수수료가 있는데 반영값이 비었다면 합계를 0으로 접지 않고 공란 처리한다.
  const permitFeeDropped = permitFee !== null && appliedPermitFee === null;
  const appliedTotalFee =
    permitFeeDropped || (appliedPermitFee === null && appliedSafetyFee === null)
      ? null
      : (appliedPermitFee ?? 0) + (appliedSafetyFee ?? 0);

  return { permitFee, changeFee, safetyFee, totalFee, appliedPermitFee, appliedSafetyFee, appliedTotalFee, canApplyToPermit, errors, warnings };
}

export function calculateFeeResult(input: FeeCalculationInput, context: FeeContext = {}): FeeCalculationResult {
  switch (input.signType) {
    case "wall_general": {
      if (!hasPositiveNumber(input.width) || !hasPositiveNumber(input.height)) return buildResult(null, null, context, ["가로와 세로를 모두 입력하세요."]);
      const area = input.width * input.height;
      const calculatedArea = input.shapeType === "입체형" ? safeRoundArea(area * 0.7) : safeRoundArea(area);
      const permitFee = applyLightingFee(getWallPermitBaseFee(calculatedArea, input.adOwnerType), input.illuminationType);
      const safetyFee = applySafetySurcharge(applyLightingFee(getWallSafetyBaseFee(calculatedArea), input.illuminationType));
      return buildResult(permitFee, safetyFee, context);
    }
    case "wall_large": {
      if (!hasPositiveNumber(input.width) || !hasPositiveNumber(input.height)) return buildResult(null, null, context, ["가로와 세로를 모두 입력하세요."]);
      const calculatedArea = safeRoundArea(input.width * input.height);
      const permitFee = applyLightingFee(getWallPermitBaseFee(calculatedArea, input.adOwnerType), input.permitIlluminationType);
      const safetyFee = applySafetySurcharge(applyLightingFee(getWallSafetyBaseFee(calculatedArea), input.safetyIlluminationType));
      return buildResult(permitFee, safetyFee, context);
    }
    case "banner_frame_general": {
      if (!hasPositiveNumber(input.width) || !hasPositiveNumber(input.height)) return buildResult(null, null, context, ["가로와 세로를 모두 입력하세요."]);
      const calculatedArea = safeRoundArea(input.width * input.height);
      const permitFee = applyLightingFee(getWallPermitBaseFee(calculatedArea, input.adOwnerType), input.illuminationType);
      const safetyFee = applySafetySurcharge(applyLightingFee(getBannerFrameSafetyBaseFee(calculatedArea), input.illuminationType));
      return buildResult(permitFee, safetyFee, context);
    }
    case "projection_general": {
      if (!hasPositiveNumber(input.width) || !hasPositiveNumber(input.height) || !hasPositiveNumber(input.faceCount)) return buildResult(null, null, context, ["가로, 세로, 면수를 모두 입력하세요."]);
      const calculatedArea = safeRoundArea(input.width * input.height * input.faceCount);
      const permitFee = applyLightingFee(getProjectionPermitBaseFee(calculatedArea), input.illuminationType);
      const safetyFee = applySafetySurcharge(applyLightingFee(getProjectionSafetyBaseFee(calculatedArea), input.illuminationType));
      return buildResult(permitFee, safetyFee, context);
    }
    case "pylon_general": {
      if (!hasPositiveNumber(input.width) || !hasPositiveNumber(input.height) || !hasPositiveNumber(input.faceCount)) return buildResult(null, null, context, ["가로, 세로, 면수를 모두 입력하세요."]);
      const calculatedArea = safeRoundArea(input.width * input.height * input.faceCount);
      const permitFee = applyLightingFee(getPylonPermitBaseFee(calculatedArea), input.illuminationType);
      const safetyFee = applySafetySurcharge(applyLightingFee(getAreaBasedSafetyBaseFee(calculatedArea), input.illuminationType));
      return buildResult(permitFee, safetyFee, context);
    }
    case "public_facility_general": {
      if (input.faces.length === 0) return buildResult(null, null, context, ["최소 한 면 이상 입력하세요."]);
      const invalidFace = input.faces.some((face) => !hasPositiveNumber(face.width) || !hasPositiveNumber(face.height));
      if (invalidFace) return buildResult(null, null, context, ["모든 면의 가로와 높이를 입력하세요."]);
      const totalArea = safeRoundArea(sum(input.faces.map((face) => face.width * face.height)));
      const internalArea = safeRoundArea(sum(input.faces.filter((face) => face.illuminationType === "내부조명").map((face) => face.width * face.height)));
      const externalArea = safeRoundArea(sum(input.faces.filter((face) => face.illuminationType === "외부조명").map((face) => face.width * face.height)));
      const permitFee = applyWeightedLightingFee(getPublicFacilityPermitBaseFee(totalArea), totalArea, internalArea, externalArea);
      const safetyFee = applySafetySurcharge(applyWeightedLightingFee(getAreaBasedSafetyBaseFee(totalArea), totalArea, internalArea, externalArea));
      return buildResult(permitFee, safetyFee, context);
    }
    case "rooftop_large": {
      if (input.faces.length === 0) return buildResult(null, null, context, ["최소 한 면 이상 입력하세요."]);
      const invalidFace = input.faces.some((face) => !hasPositiveNumber(face.width) || !hasPositiveNumber(face.panelHeight) || !hasNonNegativeNumber(face.extraHeightForSafety));
      if (invalidFace) return buildResult(null, null, context, ["모든 면의 가로, 판 높이, 안전 추가 높이를 확인하세요."]);
      const totalPermitArea = safeRoundArea(sum(input.faces.map((face) => face.width * face.panelHeight)));
      const internalPermitArea = safeRoundArea(sum(input.faces.filter((face) => face.illuminationType === "내부조명").map((face) => face.width * face.panelHeight)));
      const externalPermitArea = safeRoundArea(sum(input.faces.filter((face) => face.illuminationType === "외부조명").map((face) => face.width * face.panelHeight)));
      const permitFee = applyWeightedLightingFee(getRooftopPermitBaseFee(totalPermitArea), totalPermitArea, internalPermitArea, externalPermitArea);
      const totalSafetyArea = safeRoundArea(sum(input.faces.map((face) => face.width * (face.panelHeight + face.extraHeightForSafety))));
      const safetyFee = applySafetySurcharge(applyWeightedLightingFee(getRooftopSafetyBaseFee(totalSafetyArea), totalSafetyArea, internalPermitArea, externalPermitArea));
      return buildResult(permitFee, safetyFee, context);
    }
  }
}

export function formatWon(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getCategoryDisplayLabel(category?: string | null): string {
  const normalized = normalizeCategory(category);
  if (normalized === CATEGORY_CHANGE) return CATEGORY_CHANGE;
  if (normalized === CATEGORY_NEW) return CATEGORY_NEW;
  return category ?? "-";
}

export function getSafetyCheckDisplayLabel(safetyCheck?: string | null): string {
  const normalized = normalizeSafetyCheck(safetyCheck);
  if (normalized === SAFETY_TARGET) return SAFETY_TARGET;
  if (normalized === SAFETY_EXCLUDED) return SAFETY_EXCLUDED;
  if (normalized === SAFETY_UNKNOWN) return SAFETY_UNKNOWN;
  return safetyCheck ?? "-";
}
