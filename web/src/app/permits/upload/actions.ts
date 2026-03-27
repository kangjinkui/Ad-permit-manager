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

async function generateNextId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  index: number,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PM-${year}-`;
  const { count } = await supabase
    .from("permit_records")
    .select("id", { count: "exact", head: true })
    .like("id", `${prefix}%`);
  const base = (count ?? 0) + index + 1;
  return `${prefix}${String(base).padStart(3, "0")}`;
}

export async function bulkCreatePermits(rows: UploadRow[]) {
  const user = await requireUser();
  if (!user) redirect("/login");

  if (!rows.length) return { error: "데이터가 없습니다." };

  const supabase = await createClient();
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = await generateNextId(supabase, i);

    const { error } = await supabase.from("permit_records").insert({
      id,
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
        permit_id: id,
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
