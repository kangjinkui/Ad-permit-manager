"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function approveUser(userId: string) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ status: "active" })
    .eq("id", userId);

  revalidatePath("/admin/users");
}

export async function rejectUser(userId: string) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ status: "rejected" })
    .eq("id", userId);

  revalidatePath("/admin/users");
}

export async function changeRole(
  userId: string,
  role: "staff" | "admin",
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);

  revalidatePath("/admin/users");
}
