import { getReviewApiPermit, reviewError } from "@/lib/permit-review-http";
import { supportsPermitReview } from "@/lib/permit-review";
import { PermitReviewStoreError, uploadReviewAttachment } from "@/lib/permit-review-store";

const maxBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function hasImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => byte === bytes[index]);
  }
  const signature = new TextDecoder().decode(bytes);
  return signature.startsWith("RIFF") && signature.endsWith("WEBP");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getReviewApiPermit(id);
  if ("response" in context) return context.response;
  if (!supportsPermitReview(context.permit.kind, context.permit.category)) {
    return reviewError("이 허가 건에 적용할 검토서 서식이 없습니다.", 422);
  }
  if (Number(request.headers.get("content-length")) > maxBytes + 64 * 1024) {
    return reviewError("5MB 이하의 사진을 첨부하세요.", 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size || !allowedTypes.has(file.type)) {
    return reviewError("JPEG, PNG, WebP 사진을 선택하세요.", 422);
  }
  if (file.size > maxBytes) return reviewError("5MB 이하의 사진을 첨부하세요.", 413);
  if (!(await hasImageSignature(file))) return reviewError("사진 파일 형식을 확인하세요.", 422);
  const filename = file.name.replace(/[\\/\u0000-\u001f\u007f\ufffe\uffff]/g, "_").toWellFormed().trim();
  if (!filename || filename.length > 200) return reviewError("사진 파일 이름을 확인하세요.", 422);

  try {
    const attachment = await uploadReviewAttachment(id, file, filename);
    return Response.json(attachment, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PermitReviewStoreError && error.code === "NOT_FOUND") {
      return reviewError("사진을 첨부하기 전에 검토서 초안을 저장하세요.", 409);
    }
    if (error instanceof PermitReviewStoreError && error.code === "INVALID_ATTACHMENT") {
      return reviewError("사진 파일과 용량을 확인하세요.", 422);
    }
    console.error("Review attachment upload failed", error);
    return reviewError("사진을 첨부하지 못했습니다. 검토서 저장소 설정을 확인하세요.", 500);
  }
}
