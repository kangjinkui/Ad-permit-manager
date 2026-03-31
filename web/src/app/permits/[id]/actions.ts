"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, requireAdmin } from "@/lib/auth";

export async function updateStatus(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const permitNo = formData.get("permit_id")?.toString() ?? "";
  const newStatus = formData.get("new_status")?.toString() ?? "";
  const note = formData.get("note")?.toString().trim() || null;

  if (!permitNo || !newStatus) return;

  const supabase = await createClient();

  const { data: current } = await supabase
    .from("permit_records")
    .select("status")
    .eq("record_no", permitNo)
    .single();

  const fromStatus = current?.status ?? null;

  await supabase
    .from("permit_records")
    .update({ status: newStatus })
    .eq("record_no", permitNo);

  const { error: histError } = await supabase.from("permit_status_history").insert({
    permit_no: permitNo,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: user.id,
    note,
  });
  if (histError) console.error("history insert error:", histError.message);

  revalidatePath(`/permits/${permitNo}`);
  revalidatePath("/permits");
  revalidatePath("/dashboard");
}

export async function updatePermit(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const permitNo = formData.get("permit_id")?.toString() ?? "";
  if (!permitNo) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("permit_records")
    .update({
      kind: formData.get("kind")?.toString(),
      category: formData.get("category")?.toString(),
      advertiser: formData.get("advertiser")?.toString(),
      place: formData.get("place")?.toString(),
      content: formData.get("content")?.toString(),
      quantity: Number(formData.get("quantity") ?? 1),
      processed_at: formData.get("processed_at")?.toString() || null,
      hearing_at: formData.get("hearing_at")?.toString() || null,
      safety_check: formData.get("safety_check")?.toString(),
      renewal_target: formData.get("renewal_target")?.toString(),
      permit_fee: formData.get("permit_fee") ? Number(formData.get("permit_fee")) : null,
      safety_fee: formData.get("safety_fee") ? Number(formData.get("safety_fee")) : null,
      updated_by: user.id,
    })
    .eq("record_no", permitNo);

  if (error) {
    console.error("updatePermit error:", error.message);
    return;
  }

  revalidatePath(`/permits/${permitNo}`);
  revalidatePath("/permits");
  revalidatePath("/dashboard");
}

export async function updateNotes(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const permitNo = formData.get("permit_id")?.toString() ?? "";
  const notes = formData.get("notes")?.toString().trim() || null;
  if (!permitNo) return;

  const supabase = await createClient();
  await supabase
    .from("permit_records")
    .update({ notes, updated_by: user.id })
    .eq("record_no", permitNo);

  revalidatePath(`/permits/${permitNo}`);
}

export async function deletePermit(formData: FormData) {
  await requireAdmin();

  const permitNo = formData.get("permit_id")?.toString() ?? "";
  if (!permitNo) return;

  const supabase = await createClient();

  // 이력 먼저 삭제 (FK 제약)
  await supabase
    .from("permit_status_history")
    .delete()
    .eq("permit_no", permitNo);

  const { error } = await supabase
    .from("permit_records")
    .delete()
    .eq("record_no", permitNo);

  if (error) {
    console.error("deletePermit error:", error.message);
    return;
  }

  revalidatePath("/permits");
  revalidatePath("/dashboard");
  redirect("/permits");
}
