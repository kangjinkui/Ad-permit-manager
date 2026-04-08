"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

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
