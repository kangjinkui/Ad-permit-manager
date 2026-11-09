"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { permitStatuses, type PermitStatus } from "@/lib/mock-data";

// .in() 필터는 URL에 실리므로 전체 선택 시 길이 제한을 넘지 않도록 나눠서 처리한다.
const BULK_CHUNK_SIZE = 200;

export async function bulkUpdatePermitStatus(permitIds: string[], newStatus: string) {
  const profile = await requireStaff();

  if (!permitStatuses.includes(newStatus as PermitStatus)) {
    return { error: "올바르지 않은 상태입니다.", updated: 0, skipped: 0 };
  }

  const supabase = await createClient();
  let updated = 0;
  let skipped = 0;
  let failure: string | null = null;

  for (let i = 0; i < permitIds.length && !failure; i += BULK_CHUNK_SIZE) {
    const chunk = permitIds.slice(i, i + BULK_CHUNK_SIZE);

    const { data: current, error: readError } = await supabase
      .from("permit_records")
      .select("record_no, status")
      .in("record_no", chunk);

    if (readError) {
      failure = readError.message;
      break;
    }

    const fromStatusByNo = new Map(
      (current ?? [])
        .filter((row) => row.status !== newStatus)
        .map((row) => [row.record_no as string, row.status as string | null]),
    );
    skipped += (current ?? []).length - fromStatusByNo.size;
    if (fromStatusByNo.size === 0) continue;

    const { data: changed, error: updateError } = await supabase
      .from("permit_records")
      .update({ status: newStatus, updated_by: profile.id })
      .in("record_no", [...fromStatusByNo.keys()])
      .select("record_no");

    if (updateError) {
      failure = updateError.message;
      break;
    }

    if (!changed || changed.length === 0) continue;
    updated += changed.length;

    const { error: histError } = await supabase.from("permit_status_history").insert(
      changed.map((row) => ({
        permit_no: row.record_no,
        from_status: fromStatusByNo.get(row.record_no) ?? null,
        to_status: newStatus,
        changed_by: profile.id,
        note: "목록에서 일괄 변경",
      })),
    );
    if (histError) failure = `상태는 변경되었으나 이력 저장에 실패했습니다: ${histError.message}`;
  }

  if (failure) console.error("bulkUpdatePermitStatus error:", failure);

  revalidatePath("/permits");
  revalidatePath("/deliberation");
  revalidatePath("/dashboard");
  return { error: failure, updated, skipped };
}

export async function bulkDeletePermits(permitIds: string[]) {
  await requireStaff();
  if (permitIds.length === 0) return { error: null };

  const supabase = await createClient();

  for (const id of permitIds) {
    await supabase
      .from("permit_status_history")
      .delete()
      .eq("permit_no", id);
  }

  const { error } = await supabase
    .from("permit_records")
    .delete()
    .in("record_no", permitIds);

  if (error) {
    console.error("bulkDeletePermits error:", error.message);
    return { error: error.message };
  }

  revalidatePath("/permits");
  revalidatePath("/dashboard");
  return { error: null };
}
