import { createClient } from "@/lib/supabase/server";
import type {
  PermitRecord,
  PermitStatus,
  PermitKind,
  PermitCategory,
} from "@/lib/mock-data";

// DB에서 반환되는 snake_case 행 타입
type PermitRow = {
  id: string;
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
};

function toPermitRecord(row: PermitRow): PermitRecord {
  return {
    id: row.id,
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
  };
}

export type PermitFilters = {
  q?: string;
  status?: string;
  kind?: string;
  category?: string;
};

export async function getPermits(filters: PermitFilters = {}): Promise<PermitRecord[]> {
  const supabase = await createClient();
  let query = supabase
    .from("permit_records")
    .select(
      "id, kind, category, advertiser, place, content, quantity, status, processed_at, hearing_at, safety_check, renewal_target, source_type",
    )
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.kind) {
    query = query.eq("kind", filters.kind);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.q) {
    query = query.or(
      `advertiser.ilike.%${filters.q}%,place.ilike.%${filters.q}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("getPermits error:", error.message);
    return [];
  }

  return (data as PermitRow[]).map(toPermitRecord);
}

export async function getPermit(id: string): Promise<PermitRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_records")
    .select(
      "id, kind, category, advertiser, place, content, quantity, status, processed_at, hearing_at, safety_check, renewal_target, source_type",
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return toPermitRecord(data as PermitRow);
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

export type StatusHistory = {
  id: string;
  permitId: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  note: string | null;
};

export async function getPermitHistory(permitId: string): Promise<StatusHistory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_status_history")
    .select("id, permit_id, from_status, to_status, changed_at, note")
    .eq("permit_id", permitId)
    .order("changed_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    permitId: r.permit_id,
    fromStatus: r.from_status,
    toStatus: r.to_status,
    changedAt: r.changed_at,
    note: r.note,
  }));
}
