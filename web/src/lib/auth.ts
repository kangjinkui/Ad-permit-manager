import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getOptionalUser() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function requireUser() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
