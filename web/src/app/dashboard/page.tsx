import { DashboardView } from "@/components/dashboard-view";
import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { hasSupabaseEnv } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import { getPermitStats, getPermits } from "@/lib/permits";

export default async function DashboardPage() {
  const envReady = hasSupabaseEnv();
  const user = await requireUser();

  const [stats, recentPermits] = await Promise.all([
    getPermitStats(),
    getPermits({}),
  ]);

  return (
    <main className="app-frame">
      <NavShell pathname="/dashboard" />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={user?.email} envReady={envReady} />
        <DashboardView stats={stats} recentPermits={recentPermits.slice(0, 6)} />
      </section>
    </main>
  );
}
