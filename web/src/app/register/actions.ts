"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function buildRegisterRedirect(params: { error?: string; email?: string }) {
  const searchParams = new URLSearchParams();
  if (params.error) searchParams.set("error", params.error);
  if (params.email) searchParams.set("email", params.email);
  const query = searchParams.toString();
  return query ? `/register?${query}` : "/register";
}

export async function signUp(formData: FormData) {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const passwordConfirm = formData.get("passwordConfirm")?.toString() ?? "";

  if (!hasSupabaseEnv()) {
    redirect(
      buildRegisterRedirect({
        error: "Supabase 환경 변수가 아직 설정되지 않았습니다.",
        email,
      }),
    );
  }

  if (!name || !email || !password) {
    redirect(
      buildRegisterRedirect({
        error: "모든 항목을 입력해 주세요.",
        email,
      }),
    );
  }

  if (password.length < 8) {
    redirect(
      buildRegisterRedirect({
        error: "비밀번호는 8자 이상이어야 합니다.",
        email,
      }),
    );
  }

  if (password !== passwordConfirm) {
    redirect(
      buildRegisterRedirect({
        error: "비밀번호가 일치하지 않습니다.",
        email,
      }),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  });

  if (error) {
    const message =
      error.message.includes("already registered") ||
      error.message.includes("already been registered")
        ? "이미 가입된 이메일 주소입니다."
        : error.message;

    redirect(buildRegisterRedirect({ error: message, email }));
  }

  redirect("/login/pending");
}
