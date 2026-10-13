"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { normalizeNextPath } from "@/lib/auth-redirect";
import {
  describeSignInError,
  isServiceUnavailableError,
  SERVICE_UNAVAILABLE_MESSAGE,
} from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

function buildLoginRedirect(params: {
  error?: string;
  email?: string;
  next?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.error) searchParams.set("error", params.error);
  if (params.email) searchParams.set("email", params.email);
  if (params.next && params.next !== "/dashboard") {
    searchParams.set("next", params.next);
  }

  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
}

export async function signIn(formData: FormData) {
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
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

  if (!email || !password) {
    redirect(
      buildLoginRedirect({
        error: "이메일과 비밀번호를 입력해 주세요.",
        email,
        next: nextPath,
      }),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (isServiceUnavailableError(error)) {
      console.error("[signIn] Supabase auth unavailable", {
        status: error.status,
        message: error.message,
      });
    }

    redirect(
      buildLoginRedirect({
        error: describeSignInError(error),
        email,
        next: nextPath,
      }),
    );
  }

  // signInWithPassword가 반환한 user를 바로 사용 (getUser() 재호출 불필요)
  const user = data.user;

  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    // 프로필 조회 자체가 실패한 경우(쿼터 제한 등)는 pending으로 오판하지 않는다.
    if (profileError && isServiceUnavailableError(profileError)) {
      console.error("[signIn] profile lookup unavailable", profileError);
      await supabase.auth.signOut();
      redirect(
        buildLoginRedirect({
          error: SERVICE_UNAVAILABLE_MESSAGE,
          email,
          next: nextPath,
        }),
      );
    }

    const status = (profile?.status as string) ?? "pending";

    if (status === "pending") {
      await supabase.auth.signOut();
      redirect("/login/pending");
    }

    if (status === "rejected") {
      await supabase.auth.signOut();
      redirect(
        buildLoginRedirect({
          error: "계정이 거절되었습니다. 관리자에게 문의해 주세요.",
          email,
        }),
      );
    }
  }

  redirect(nextPath);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
