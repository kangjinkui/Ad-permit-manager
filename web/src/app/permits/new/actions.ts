"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

function padded(n: number) {
  return String(n).padStart(3, "0");
}

async function generateRecordNo(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PM-${year}-`;

  const { data } = await supabase
    .from("permit_records")
    .select("record_no")
    .like("record_no", `${prefix}%`)
    .order("record_no", { ascending: false })
    .limit(1);

  const last = data?.[0]?.record_no;
  const lastNum = last ? parseInt(last.replace(prefix, ""), 10) : 0;

  return `${prefix}${padded((isNaN(lastNum) ? 0 : lastNum) + 1)}`;
}

export async function createPermit(formData: FormData) {
  const profile = await requireStaff();

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
  const renewalTarget =
    formData.get("renewal_target")?.toString() ?? "연장대상 아님";

  if (!advertiser || !kind || !category || !place || !content || !status) {
    redirect("/permits/new?error=필수+항목을+모두+입력해+주세요");
  }

  const supabase = await createClient();
  const recordNo = await generateRecordNo(supabase);

  const { error: insertError } = await supabase.from("permit_records").insert({
    record_no: recordNo,
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
    created_by: profile.id,
  });

  if (insertError) {
    redirect(`/permits/new?error=${encodeURIComponent(insertError.message)}`);
  }

  await supabase.from("permit_status_history").insert({
    permit_no: recordNo,
    from_status: null,
    to_status: status,
    changed_by: profile.id,
    note: "신규 등록",
  });

  revalidatePath("/permits");
  revalidatePath("/dashboard");
  redirect("/permits");
}
