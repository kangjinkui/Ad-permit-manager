import { generatePermitReviewHwpx } from "@/lib/permit-review-hwpx";
import { downloadHeaders, getReviewApiPermit, isReviewVersion, reviewConflict, reviewError } from "@/lib/permit-review-http";
import { getReviewDownloadError, normalizeReviewDraft, reviewTemplateVersion, selectReviewTemplate } from "@/lib/permit-review";
import { getPermitReview, listReviewAttachments } from "@/lib/permit-review-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getReviewApiPermit(id);
  if ("response" in context) return context.response;
  const { permit } = context;

  const input: { version?: unknown } | null = await request.json().catch(() => null);
  if (!input || !isReviewVersion(input.version)) return reviewError("검토서 초안을 저장하세요.", 400);

  try {
    const saved = await getPermitReview(id);
    if (!saved) return reviewError("저장된 검토서 초안을 찾을 수 없습니다.", 404);
    if (saved.version !== input.version) return reviewError(reviewConflict, 409);

    const selected = selectReviewTemplate(permit.kind, permit.category, saved.draft.fields);
    if (!selected.templateId) return reviewError(selected.error ?? "검토서 서식을 선택하세요.", 422);
    if (selected.templateId !== saved.templateId || saved.templateVersion !== reviewTemplateVersion) {
      return reviewError("현재 허가 정보와 서식에 맞춰 검토서를 다시 저장하세요.", 409);
    }
    const normalized = normalizeReviewDraft(saved.draft, permit.kind, permit.category);
    if ("error" in normalized) return reviewError(normalized.error, 422);
    const missing = getReviewDownloadError(selected.templateId, normalized.draft.fields);
    if (missing) return reviewError(missing, 422);

    const attachments = await listReviewAttachments(id);
    const file = await generatePermitReviewHwpx(selected.templateId, normalized.draft, attachments.map(({ name }) => name));
    return new Response(file, {
      headers: downloadHeaders(`옥외광고물_검토서_${id}.hwpx`, "application/hwp+zip"),
    });
  } catch (error) {
    console.error("Review HWPX generation failed", error);
    return reviewError("검토서 HWPX를 만들지 못했습니다. 서버의 서식 파일과 저장된 초안을 확인하세요.", 500);
  }
}
