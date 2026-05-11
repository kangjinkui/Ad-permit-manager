export type PermitStatus =
  | "접수"
  | "공문발송"
  | "내용보완"
  | "본심의상정예정"
  | "서울시심의 상정예정"
  | "소심의 상정예정"
  | "연장고지서 및 안전점검의뢰"
  | "우편발송예정"
  | "이메일 발송예정"
  | "이메일 발송완료"
  | "직접방문수령";

export type PermitKind =
  | "벽면이용간판"
  | "돌출간판"
  | "입간판"
  | "지주간판"
  | "옥상간판"
  | "현수막게시틀"
  | "공공시설물이용 광고물"
  | "교통수단이용 광고물";

export type PermitCategory = "신규" | "연장" | "내용변경" | "관리자변경";

export type SignFace = {
  width: number | null;
  height: number | null;
  lighting: "비조명" | "내부조명" | "외부조명" | null;
};

export type PermitRecord = {
  id: string;
  kind: PermitKind;
  category: PermitCategory;
  advertiser: string;
  place: string;
  content: string;
  quantity: number;
  status: PermitStatus;
  processedAt: string;
  hearingAt: string | null;
  safetyCheck: "대상" | "대상아님" | "확인필요";
  renewalTarget: "연장대상" | "연장대상 아님";
  sourceType: "excel" | "manual";
  permitFee: number | null;
  safetyFee: number | null;
  width: number | null;
  height: number | null;
  lighting: "비조명" | "내부조명" | "외부조명" | null;
  signFaces: SignFace[] | null;
};

export const mockPermits: PermitRecord[] = [
  {
    id: "PM-2026-001",
    kind: "벽면이용간판",
    category: "신규",
    advertiser: "힐링페이퍼",
    place: "강남대로 498, 6층",
    content: "unni guide 언니가이드",
    quantity: 1,
    status: "직접방문수령",
    processedAt: "2026-03-05",
    hearingAt: "2026-02-27",
    safetyCheck: "대상아님",
    renewalTarget: "연장대상 아님",
    sourceType: "excel",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
  {
    id: "PM-2026-002",
    kind: "벽면이용간판",
    category: "신규",
    advertiser: "사이오닉에이아이",
    place: "남부순환로359길 29, 3층",
    content: "Sionic AI",
    quantity: 1,
    status: "우편발송예정",
    processedAt: "2026-03-24",
    hearingAt: "2026-03-28",
    safetyCheck: "대상아님",
    renewalTarget: "연장대상 아님",
    sourceType: "manual",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
  {
    id: "PM-2026-003",
    kind: "입간판",
    category: "신규",
    advertiser: "휴메이크 코퍼레이션",
    place: "봉은사로 327, 1층",
    content: "휴메이크 휘트니스",
    quantity: 1,
    status: "내용보완",
    processedAt: "2026-03-21",
    hearingAt: null,
    safetyCheck: "대상아님",
    renewalTarget: "연장대상 아님",
    sourceType: "excel",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
  {
    id: "PM-2026-004",
    kind: "옥상간판",
    category: "내용변경",
    advertiser: "루프호텔",
    place: "논현로 221",
    content: "로고 사인 교체",
    quantity: 1,
    status: "서울시심의 상정예정",
    processedAt: "2026-03-22",
    hearingAt: "2026-04-02",
    safetyCheck: "대상",
    renewalTarget: "연장대상 아님",
    sourceType: "manual",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
  {
    id: "PM-2026-005",
    kind: "공공시설물이용 광고물",
    category: "내용변경",
    advertiser: "강남 스마트쉼터",
    place: "강남역 11번 출구 앞",
    content: "공공시설물 광고 교체",
    quantity: 2,
    status: "공문발송",
    processedAt: "2026-03-23",
    hearingAt: "2026-04-09",
    safetyCheck: "대상아님",
    renewalTarget: "연장대상 아님",
    sourceType: "manual",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
  {
    id: "PM-2026-006",
    kind: "교통수단이용 광고물",
    category: "내용변경",
    advertiser: "강남 순환버스 광고",
    place: "강남구 순환버스 6대",
    content: "차량 래핑 광고 교체",
    quantity: 6,
    status: "이메일 발송완료",
    processedAt: "2026-03-23",
    hearingAt: null,
    safetyCheck: "대상아님",
    renewalTarget: "연장대상 아님",
    sourceType: "manual",
    permitFee: null,
    safetyFee: null,
    width: null,
    height: null,
    lighting: null,
    signFaces: null,
  },
];

export const permitStatuses: PermitStatus[] = [
  "접수",
  "공문발송",
  "내용보완",
  "본심의상정예정",
  "서울시심의 상정예정",
  "소심의 상정예정",
  "연장고지서 및 안전점검의뢰",
  "우편발송예정",
  "이메일 발송예정",
  "이메일 발송완료",
  "직접방문수령",
];

export const permitKinds: PermitKind[] = [
  "벽면이용간판",
  "돌출간판",
  "입간판",
  "지주간판",
  "옥상간판",
  "현수막게시틀",
  "공공시설물이용 광고물",
  "교통수단이용 광고물",
];

export const permitCategories: PermitCategory[] = ["신규", "연장", "내용변경", "관리자변경"];
