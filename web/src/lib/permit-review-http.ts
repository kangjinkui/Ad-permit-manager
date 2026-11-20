import { getProfile, type Profile } from "./auth";
import { getPermit, type PermitWithStaff } from "./permits";

export function reviewError(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function getReviewApiPermit(id: string): Promise<
  { permit: PermitWithStaff; profile: Profile } | { response: Response }
> {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") return { response: reviewError("활성 계정으로 로그인하세요.", 401) };
  const permit = await getPermit(id);
  if (!permit) return { response: reviewError("허가 건을 찾을 수 없습니다.", 404) };
  return { permit, profile };
}

export function isReviewVersion(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
}

export function downloadHeaders(filename: string, contentType: string): HeadersInit {
  const safeName = filename.replace(/[\\/\u0000-\u001f\u007f]/g, "_").toWellFormed();
  const encoded = encodeURIComponent(safeName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export const reviewConflict = "다른 사람이 검토서를 저장했습니다. 페이지를 다시 열어 최신 내용을 확인하세요.";
