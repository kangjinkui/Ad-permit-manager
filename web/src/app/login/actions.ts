"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { getRequestOrigin, normalizeNextPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

function buildLoginRedirect(params: {
  error?: string;
  status?: string;
  email?: string;
  next?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.error) {
    searchParams.set("error", params.error);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.email) {
    searchParams.set("email", params.email);
  }

  if (params.next && params.next !== "/dashboard") {
    searchParams.set("next", params.next);
  }

  const query = searchParams.toString();

  return query ? `/login?${query}` : "/login";
}

export async function sendMagicLink(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const nextPath = normalizeNextPath(formData.get("next"));

  if (!hasSupabaseEnv()) {
    redirect(
      buildLoginRedirect({
        error: "Supabase 환경 변수가 아직 설정되지 않았습니다.",
        email,
        next: nextPath,
      }),
    );
  }

  if (!email) {
    redirect(
      buildLoginRedirect({
        error: "이메일 주소를 입력해 주세요.",
        next: nextPath,
      }),
    );
  }

  if (!email.endsWith("@gangnam.go.kr")) {
    redirect(
      buildLoginRedirect({
        error: "@gangnam.go.kr 메일 주소만 로그인할 수 있습니다.",
        email,
        next: nextPath,
      }),
    );
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    redirect(
      buildLoginRedirect({
        error: error.message,
        email,
        next: nextPath,
      }),
    );
  }

  redirect(
    buildLoginRedirect({
      status: "sent",
      email,
      next: nextPath,
    }),
  );
}
