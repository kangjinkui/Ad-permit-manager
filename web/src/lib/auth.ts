import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "staff" | "admin";
  status: "pending" | "active" | "rejected";
  department: string | null;
};

export async function getProfile(): Promise<Profile | null> {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, role, status, department")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

export async function requireActiveUser(): Promise<Profile> {
  if (!hasSupabaseEnv()) {
    redirect("/login");
  }

  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.status === "pending") {
    redirect("/login/pending");
  }

  if (profile.status === "rejected") {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "계정이 거절되었습니다. 관리자에게 문의해 주세요.",
        ),
    );
  }

  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireActiveUser();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}

// 하위 호환 유지
export async function getOptionalUser() {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  if (!hasSupabaseEnv()) return null;

  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
