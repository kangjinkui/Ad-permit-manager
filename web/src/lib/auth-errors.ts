/**
 * Supabase 인증/DB 호출 실패를 "사용자 잘못"과 "서비스 장애"로 구분한다.
 *
 * 쿼터 초과로 프로젝트가 정지되면 Supabase는 402를 반환하는데,
 * 이를 자격증명 오류로 표시하면 원인 파악이 불가능하므로 분리한다.
 */

export const SERVICE_UNAVAILABLE_MESSAGE =
  "인증 서버에 연결할 수 없습니다. Supabase 프로젝트 상태(사용량·요금제 제한)를 확인해 주세요.";

type MaybeError = { status?: number; code?: string; message?: string } | null;

/** 402(쿼터/요금제 제한), 429(rate limit), 5xx, 네트워크 실패 */
export function isServiceUnavailableError(error: MaybeError): boolean {
  if (!error) return false;

  const status = error.status;
  if (status === 402 || status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  const message = error.message ?? "";
  return (
    message.includes("restricted due to the following violations") ||
    message.includes("fetch failed") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Failed to fetch")
  );
}

/** 로그인 실패 메시지 (서비스 장애는 그대로 노출, 그 외는 자격증명 오류로 통일) */
export function describeSignInError(error: MaybeError): string {
  if (isServiceUnavailableError(error)) return SERVICE_UNAVAILABLE_MESSAGE;
  return "이메일 또는 비밀번호가 올바르지 않습니다.";
}

/** 회원가입 실패 메시지 */
export function describeSignUpError(error: MaybeError): string {
  if (isServiceUnavailableError(error)) return SERVICE_UNAVAILABLE_MESSAGE;

  const message = error?.message ?? "";
  if (
    message.includes("already registered") ||
    message.includes("already been registered")
  ) {
    return "이미 가입된 이메일 주소입니다.";
  }

  return message || "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}
