import { createClient } from "@/lib/supabase/server";
import type {
  PermitRecord,
  PermitStatus,
  PermitKind,
  PermitCategory,
  SignFace,
} from "@/lib/mock-data";
import type { PermitSignFace } from "@/lib/sign-faces";

type PermitRow = {
  record_no: string;
  kind: string;
  category: string;
  advertiser: string;
  place: string;
  content: string;
  quantity: number;
  status: string;
  processed_at: string | null;
  hearing_at: string | null;
  safety_check: string;
  renewal_target: string;
  source_type: string;
  notes: string | null;
  permit_fee: number | null;
  safety_fee: number | null;
  width: number | null;
  height: number | null;
  lighting: string | null;
  sign_faces: unknown;
  review_opinion: string | null;
  profiles: { name: string; title: string | null } | { name: string; title: string | null }[] | null;
};

export type PermitWithStaff = Omit<PermitRecord, "signFaces"> & {
  signFaces: PermitSignFace[] | null;
  staffName: string | null;
  staffTitle: string | null;
  notes: string | null;
  reviewOpinion: string | null;
};

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeLighting(value: unknown): SignFace["lighting"] {
  return value === "비조명" || value === "내부조명" || value === "외부조명" ? value : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeSignFaces(value: unknown): PermitSignFace[] | null {
  if (!Array.isArray(value)) return null;

  const faces = value
    .map((face) => {
      if (!face || typeof face !== "object") return null;
      const data = face as Record<string, unknown>;
      return {
        width: normalizeNumber(data.width),
        height: normalizeNumber(data.height),
        lighting: normalizeLighting(data.lighting),
        place: normalizeText(data.place),
        content: normalizeText(data.content),
      };
    })
    .filter((face): face is PermitSignFace => Boolean(face));

  return faces.length > 0 ? faces : null;
}

function toPermitWithStaff(row: PermitRow): PermitWithStaff {
  return {
    id: row.record_no,
    kind: row.kind as PermitKind,
    category: row.category as PermitCategory,
    advertiser: row.advertiser,
    place: row.place,
    content: row.content,
    quantity: row.quantity,
    status: row.status as PermitStatus,
    processedAt: row.processed_at ?? "",
    hearingAt: row.hearing_at,
    safetyCheck: row.safety_check as PermitRecord["safetyCheck"],
    renewalTarget: row.renewal_target as PermitRecord["renewalTarget"],
    sourceType: row.source_type as PermitRecord["sourceType"],
    staffName: Array.isArray(row.profiles)
      ? (row.profiles[0]?.name ?? null)
      : (row.profiles?.name ?? null),
    staffTitle: Array.isArray(row.profiles)
      ? (row.profiles[0]?.title ?? null)
      : (row.profiles?.title ?? null),
    notes: row.notes ?? null,
    permitFee: row.permit_fee ?? null,
    safetyFee: row.safety_fee ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    lighting: (row.lighting ?? null) as PermitRecord["lighting"],
    signFaces: normalizeSignFaces(row.sign_faces),
    reviewOpinion: row.review_opinion ?? null,
  };
}

export type StaffOption = { id: string; name: string };

export async function getStaffList(): Promise<StaffOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  return (data ?? []) as StaffOption[];
}

export type PermitFilters = {
  q?: string;
  status?: string;
  kind?: string;
  category?: string;
  staffName?: string;
};

export async function getPermits(
  filters: PermitFilters = {},
): Promise<PermitWithStaff[]> {
  const supabase = await createClient();
  let query = supabase
    .from("permit_records")
    .select(
      "record_no, kind, category, advertiser, place, content, quantity, status, processed_at, hearing_at, safety_check, renewal_target, source_type, notes, permit_fee, safety_fee, width, height, lighting, sign_faces, review_opinion, profiles!created_by(name,title)",
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.q) {
    query = query.or(
      `advertiser.ilike.%${filters.q}%,place.ilike.%${filters.q}%`,
    );
  }
  if (filters.staffName) {
    const { data: staffData } = await supabase
      .from("profiles")
      .select("id")
      .ilike("name", `%${filters.staffName}%`);
    const ids = (staffData ?? []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return [];
    query = query.in("created_by", ids);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getPermits error:", error.message);
    return [];
  }

  return (data as PermitRow[]).map(toPermitWithStaff);
}

export async function getPermit(recordNo: string): Promise<PermitWithStaff | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_records")
    .select(
      "record_no, kind, category, advertiser, place, content, quantity, status, processed_at, hearing_at, safety_check, renewal_target, source_type, notes, permit_fee, safety_fee, width, height, lighting, sign_faces, review_opinion, profiles!created_by(name,title)",
    )
    .eq("record_no", recordNo)
    .single();

  if (error || !data) return null;
  return toPermitWithStaff(data as PermitRow);
}

export type PermitStats = {
  total: number;
  reviewScheduled: number;
  pendingSafety: number;
  manualCount: number;
};

export async function getPermitStats(): Promise<PermitStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_records")
    .select("hearing_at, safety_check, source_type");

  if (error || !data) {
    return { total: 0, reviewScheduled: 0, pendingSafety: 0, manualCount: 0 };
  }

  return {
    total: data.length,
    reviewScheduled: data.filter((r) => r.hearing_at).length,
    pendingSafety: data.filter((r) => r.safety_check === "대상").length,
    manualCount: data.filter((r) => r.source_type === "manual").length,
  };
}

// 민원인에게 결과가 전달된 상태. 나머지(접수·보완·심의 상정예정·발송예정 등)는 진행중.
export const completedStatuses: ReadonlySet<PermitStatus> = new Set<PermitStatus>([
  "공문발송",
  "이메일 발송완료",
  "직접방문수령",
]);

// 엑셀 업로드 건은 상태 원문이 그대로 저장되므로 띄어쓰기 차이("이메일발송완료", "공문 발송")를 무시하고 비교한다.
const completedStatusKeys = new Set([...completedStatuses].map((s) => s.replace(/\s/g, "")));

export function isCompletedStatus(status: string): boolean {
  return completedStatusKeys.has(status.replace(/\s/g, ""));
}

// 엑셀 업로드 건은 created_by가 업로드한 사람이라 실제 담당자를 알 수 없으므로 개인 집계에서 분리한다.
export const EXCEL_GROUP_NAME = "엑셀 일괄등록";
export const UNASSIGNED_GROUP_NAME = "미지정";

export type StaffProgress = {
  staffName: string;
  inProgress: number;
  completed: number;
  inProgressByStatus: { status: string; count: number }[];
};

export async function getStaffProgress(): Promise<StaffProgress[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_records")
    .select("status, source_type, profiles!created_by(name)");

  if (error || !data) return [];

  const byStaff = new Map<string, { completed: number; inProgress: Map<string, number> }>();
  for (const row of data as Pick<PermitRow, "status" | "source_type" | "profiles">[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const staffName =
      row.source_type === "excel" ? EXCEL_GROUP_NAME : (profile?.name ?? UNASSIGNED_GROUP_NAME);
    const entry = byStaff.get(staffName) ?? { completed: 0, inProgress: new Map<string, number>() };
    const status = row.status.trim() || "(상태 없음)";
    if (isCompletedStatus(status)) entry.completed += 1;
    else entry.inProgress.set(status, (entry.inProgress.get(status) ?? 0) + 1);
    byStaff.set(staffName, entry);
  }

  return [...byStaff.entries()]
    .map(([staffName, { completed, inProgress }]) => {
      const inProgressByStatus = [...inProgress.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);
      return {
        staffName,
        completed,
        inProgress: inProgressByStatus.reduce((sum, s) => sum + s.count, 0),
        inProgressByStatus,
      };
    })
    .sort((a, b) => {
      const groupOrder = (name: string) =>
        name === EXCEL_GROUP_NAME || name === UNASSIGNED_GROUP_NAME ? 1 : 0;
      return (
        groupOrder(a.staffName) - groupOrder(b.staffName) ||
        b.inProgress - a.inProgress ||
        a.staffName.localeCompare(b.staffName, "ko")
      );
    });
}

export type StatusHistory = {
  id: string;
  permitId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  note: string | null;
};

export async function getPermitHistory(
  permitNo: string,
): Promise<StatusHistory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_status_history")
    .select("id, permit_no, from_status, to_status, changed_at, note")
    .eq("permit_no", permitNo)
    .order("changed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    permitId: r.permit_no,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    changedAt: r.changed_at,
    note: r.note,
  }));
}
