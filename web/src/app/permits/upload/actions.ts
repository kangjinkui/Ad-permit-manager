"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type UploadRow = {
  kind: string;
  category: string;
  advertiser: string;
  place: string;
  content: string;
  quantity: number;
  status: string;
  processedAt: string | null;
  hearingAt: string | null;
  safetyCheck: string;
  renewalTarget: string;
};

export async function bulkCreatePermits(rows: UploadRow[]) {
  const user = await requireUser();
  if (!user) redirect("/login");

  if (!rows.length) return { error: "데이터가 없습니다." };

  const supabase = await createClient();
  const errors: string[] = [];

  // 현재 연도의 최대 번호를 한 번만 조회
  const year = new Date().getFullYear();
  const prefix = `PM-${year}-`;
  const { data: existingNos } = await supabase
    .from("permit_records")
    .select("record_no")
    .like("record_no", `${prefix}%`);

  const maxNo = (existingNos ?? []).reduce((max, r) => {
    const n = parseInt((r.record_no as string).replace(prefix, ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const recordNo = `${prefix}${String(maxNo + i + 1).padStart(3, "0")}`;

    const { error } = await supabase.from("permit_records").insert({
      record_no: recordNo,
      kind: row.kind,
      category: row.category,
      advertiser: row.advertiser,
      place: row.place,
      content: row.content,
      quantity: row.quantity,
      status: row.status,
      processed_at: row.processedAt,
      hearing_at: row.hearingAt,
      safety_check: row.safetyCheck,
      renewal_target: row.renewalTarget,
      source_type: "excel",
      created_by: user.id,
    });

    if (error) {
      errors.push(`행 ${i + 1} (${row.advertiser}): ${error.message}`);
    } else {
      await supabase.from("permit_status_history").insert({
        permit_no: recordNo,
        from_status: null,
        to_status: row.status,
        changed_by: user.id,
        note: "엑셀 업로드",
      });
    }
  }

  revalidatePath("/permits");
  revalidatePath("/dashboard");

  if (errors.length) {
    return { error: errors.join("\n") };
  }
  return { success: true, count: rows.length };
}
