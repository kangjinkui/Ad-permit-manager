"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

function padded(n: number) {
  return String(n).padStart(3, "0");
}

async function generateId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PM-${year}-`;

  const { count } = await supabase
    .from("permit_records")
    .select("id", { count: "exact", head: true })
    .like("id", `${prefix}%`);

  return `${prefix}${padded((count ?? 0) + 1)}`;
}

export async function createPermit(formData: FormData) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const advertiser = formData.get("advertiser")?.toString().trim() ?? "";
  const kind = formData.get("kind")?.toString() ?? "";
  const category = formData.get("category")?.toString() ?? "";
  const place = formData.get("place")?.toString().trim() ?? "";
  const content = formData.get("content")?.toString().trim() ?? "";
  const status = formData.get("status")?.toString() ?? "";
  const processedAt = formData.get("processed_at")?.toString() || null;
  const hearingAt = formData.get("hearing_at")?.toString() || null;
  const quantity = parseInt(formData.get("quantity")?.toString() ?? "1", 10);
  const safetyCheck = formData.get("safety_check")?.toString() ?? "확인필요";
  const renewalTarget = formData.get("renewal_target")?.toString() ?? "연장대상 아님";

  if (!advertiser || !kind || !category || !place || !content || !status) {
    redirect("/permits/new?error=필수+항목을+모두+입력해+주세요");
  }

  const supabase = await createClient();
  const id = await generateId(supabase);

  const { error: insertError } = await supabase.from("permit_records").insert({
    id,
    kind,
    category,
    advertiser,
    place,
    content,
    quantity: isNaN(quantity) ? 1 : quantity,
    status,
    processed_at: processedAt,
    hearing_at: hearingAt,
    safety_check: safetyCheck,
    renewal_target: renewalTarget,
    source_type: "manual",
    created_by: user.id,
  });

  if (insertError) {
    redirect(`/permits/new?error=${encodeURIComponent(insertError.message)}`);
  }

  // 최초 등록 이력 기록
  await supabase.from("permit_status_history").insert({
    permit_id: id,
    from_status: null,
    to_status: status,
    changed_by: user.id,
    note: "신규 등록",
  });

  revalidatePath("/permits");
  revalidatePath("/dashboard");
  redirect("/permits");
}
