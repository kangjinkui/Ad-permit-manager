"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

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

  await supabase.from("permit_status_history").insert({
    permit_no: permitNo,
    from_status: fromStatus,
    to_status: newStatus,
    changed_by: user.id,
    note,
  });

  revalidatePath(`/permits/${permitNo}`);
  revalidatePath("/permits");
  revalidatePath("/dashboard");
}
