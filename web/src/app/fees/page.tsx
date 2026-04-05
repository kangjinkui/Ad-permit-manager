import { AuthStatus } from "@/components/auth-status";
import { FeeCalculatorClient } from "@/components/fee-calculator-client";
import { NavShell } from "@/components/nav-shell";
import { SetupBanner } from "@/components/setup-banner";
import { getProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { getPermits } from "@/lib/permits";

export default async function FeesPage() {
  const envReady = hasSupabaseEnv();
  const profile = await getProfile();
  const permits = envReady ? await getPermits({}) : [];

  return (
    <main className="app-frame">
      <NavShell pathname="/fees" profile={profile} />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={profile?.email} envReady={envReady} />
        <FeeCalculatorClient permits={permits} />
      </section>
    </main>
  );
}
