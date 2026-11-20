import { getReviewApiPermit, isReviewVersion, reviewConflict, reviewError } from "@/lib/permit-review-http";
import { normalizeReviewDraft, supportsPermitReview } from "@/lib/permit-review";
import { savePermitReview } from "@/lib/permit-review-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getReviewApiPermit(id);
  if ("response" in context) return context.response;
  const { permit, profile } = context;
  if (!supportsPermitReview(permit.kind, permit.category)) {
    return reviewError("이 간판 종류와 신청 구분에 해당하는 검토서 서식이 없습니다.", 422);
  }

  const input: { draft?: unknown; version?: unknown } | null = await request.json().catch(() => null);
  if (!input || (input.version !== null && !isReviewVersion(input.version))) {
    return reviewError("초안 저장 요청을 확인하세요.", 400);
  }
  const normalized = normalizeReviewDraft(input.draft, permit.kind, permit.category);
  if ("error" in normalized) return reviewError(normalized.error, 422);

  try {
    const { draft, templateId } = normalized;
    const version = await savePermitReview(id, draft, templateId, input.version, profile.id);
    if (!version) return reviewError(reviewConflict, 409);
    return Response.json({ version, templateId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Review draft save failed", error);
    return reviewError("검토서를 저장하지 못했습니다. 검토서 DB 설정과 연결 상태를 확인하세요.", 500);
  }
}
