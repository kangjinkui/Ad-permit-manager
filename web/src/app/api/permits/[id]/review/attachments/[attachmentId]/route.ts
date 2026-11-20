import { downloadHeaders, getReviewApiPermit, isReviewVersion, reviewError } from "@/lib/permit-review-http";
import { deleteReviewAttachment, downloadReviewAttachment, PermitReviewStoreError } from "@/lib/permit-review-store";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

function attachmentError(error: unknown): Response {
  if (error instanceof PermitReviewStoreError && error.code === "NOT_FOUND") {
    return reviewError("첨부 사진을 찾을 수 없습니다.", 404);
  }
  console.error("Review attachment request failed", error);
  return reviewError("첨부 사진을 처리하지 못했습니다. 검토서 저장소 설정을 확인하세요.", 500);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id, attachmentId } = await params;
  const context = await getReviewApiPermit(id);
  if ("response" in context) return context.response;
  if (!isReviewVersion(attachmentId)) return reviewError("첨부 사진을 찾을 수 없습니다.", 404);

  try {
    const { data, name, contentType } = await downloadReviewAttachment(id, attachmentId);
    return new Response(data, { headers: downloadHeaders(name, contentType) });
  } catch (error) {
    return attachmentError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, attachmentId } = await params;
  const context = await getReviewApiPermit(id);
  if ("response" in context) return context.response;
  if (!isReviewVersion(attachmentId)) return reviewError("첨부 사진을 찾을 수 없습니다.", 404);

  try {
    await deleteReviewAttachment(id, attachmentId);
    return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return attachmentError(error);
  }
}
