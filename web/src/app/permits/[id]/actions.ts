"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function updateStatus(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const permitId = formData.get("permit_id")?.toString() ?? "";
  const newStatus = formData.get("new_status")?.toString() ?? "";
  const note = formData.get("note")?.toString().trim() || null;

  if (!permitId || !newStatus) return;

  const supabase = await createClient();

  // 현재 상태 조회 (이력용)
  const { data: current } = await supabase
    .from("permit_records")
    .select("status")
    .eq("id", permitId)
    .single();

  const fromStatus = current?.status ?? null;

  await supabase
    .from("permit_records")
    .update({ status: newStatus })
    .eq("id", permitId);

  await supabase.from("permit_status_history").insert({
    permit_id: permitId,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: user.id,
    note,
  });

  revalidatePath(`/permits/${permitId}`);
  revalidatePath("/permits");
  revalidatePath("/dashboard");
}
