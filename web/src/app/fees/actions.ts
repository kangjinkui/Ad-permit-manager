"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  calculateFeeResult,
  isFeeSignTypeCompatible,
  type FeeCalculationInput,
} from "@/lib/fees";
import { createClient } from "@/lib/supabase/server";

type SaveFeeCalculationPayload = {
  permitRecordNo?: string | null;
  permitKindSnapshot?: string | null;
  categorySnapshot?: string | null;
  safetyCheckSnapshot?: string | null;
  input: FeeCalculationInput;
};

type ActionResult = {
  error: string | null;
  success: boolean;
};

export async function saveFeeCalculation(
  payload: SaveFeeCalculationPayload,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) redirect("/login");

  const result = calculateFeeResult(payload.input, {
    category: payload.categorySnapshot,
    safetyCheck: payload.safetyCheckSnapshot,
  });

  if (result.errors.length > 0) {
    return { error: result.errors.join(" "), success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("fee_calculations").insert({
    permit_record_no: payload.permitRecordNo ?? null,
    fee_sign_type: payload.input.signType,
    permit_kind_snapshot: payload.permitKindSnapshot ?? null,
    category_snapshot: payload.categorySnapshot ?? null,
    input_data: payload.input,
    permit_fee: result.permitFee,
    safety_fee: result.safetyFee,
    total_fee: result.totalFee,
    change_fee: result.changeFee,
    created_by: user.id,
  });

  if (error) {
    console.error("saveFeeCalculation error:", error.message);
    return { error: error.message, success: false };
  }

  revalidatePath("/fees");
  return { error: null, success: true };
}

export async function applyFeeCalculationToPermit(
  payload: SaveFeeCalculationPayload,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user) redirect("/login");

  if (!payload.permitRecordNo) {
    return { error: "반영할 허가 기록을 선택하세요.", success: false };
  }

  const supabase = await createClient();
  const { data: permit, error: permitError } = await supabase
    .from("permit_records")
    .select("record_no, kind, category, safety_check")
    .eq("record_no", payload.permitRecordNo)
    .single();

  if (permitError || !permit) {
    return { error: "허가 기록을 찾을 수 없습니다.", success: false };
  }

  if (!isFeeSignTypeCompatible(permit.kind, payload.input.signType)) {
    return {
      error: "선택한 허가 종류와 계산 유형이 맞지 않습니다.",
      success: false,
    };
  }

  const result = calculateFeeResult(payload.input, {
    category: permit.category,
    safetyCheck: permit.safety_check,
  });

  if (result.errors.length > 0) {
    return { error: result.errors.join(" "), success: false };
  }

  if (!result.canApplyToPermit) {
    return {
      error:
        result.warnings[0] ??
        "현재 허가 상태에서는 계산 결과를 permit에 반영할 수 없습니다.",
      success: false,
    };
  }

  const { error: updateError } = await supabase
    .from("permit_records")
    .update({
      permit_fee: result.appliedPermitFee,
      safety_fee: result.appliedSafetyFee,
      updated_by: user.id,
    })
    .eq("record_no", payload.permitRecordNo);

  if (updateError) {
    console.error("applyFeeCalculationToPermit update error:", updateError.message);
    return { error: updateError.message, success: false };
  }

  const { error: insertError } = await supabase.from("fee_calculations").insert({
    permit_record_no: payload.permitRecordNo,
    fee_sign_type: payload.input.signType,
    permit_kind_snapshot: permit.kind,
    category_snapshot: permit.category,
    input_data: payload.input,
    permit_fee: result.appliedPermitFee,
    safety_fee: result.appliedSafetyFee,
    total_fee: result.appliedTotalFee,
    change_fee: result.changeFee,
    created_by: user.id,
  });

  if (insertError) {
    console.error("applyFeeCalculationToPermit insert error:", insertError.message);
    return { error: insertError.message, success: false };
  }

  revalidatePath("/fees");
  revalidatePath("/permits");
  revalidatePath(`/permits/${payload.permitRecordNo}`);
  revalidatePath("/dashboard");
  return { error: null, success: true };
}
