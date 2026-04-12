import { AuthStatus } from "@/components/auth-status";
import { NavShell } from "@/components/nav-shell";
import { SetupBanner } from "@/components/setup-banner";
import { getProfile, requireStaff } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { getPermits } from "@/lib/permits";
import { DeliberationClient } from "./deliberation-client";

export default async function DeliberationPage() {
  const envReady = hasSupabaseEnv();
  const profile = envReady ? await requireStaff() : await getProfile();
  const permits = envReady ? await getPermits({ status: "소심의 상정예정" }) : [];

  return (
    <main className="app-frame">
      <NavShell pathname="/deliberation" profile={profile} />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={profile?.email} envReady={envReady} />
        <DeliberationClient permits={permits} envReady={envReady} />
      </section>
    </main>
  );
}
