import { NavShell } from "@/components/nav-shell";
import { PermitsTable } from "@/components/permits-table";
import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { getProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import type { PermitFilters } from "@/lib/permits";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PermitsPage({ searchParams }: PageProps) {
  const envReady = hasSupabaseEnv();
  const profile = await getProfile();
  const params = (await searchParams) ?? {};

  const filters: PermitFilters = {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    kind: typeof params.kind === "string" ? params.kind : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
    staffName: typeof params.staffName === "string" ? params.staffName : undefined,
  };

  return (
    <main className="app-frame">
      <NavShell pathname="/permits" profile={profile} />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={profile?.email} envReady={envReady} />
        <PermitsTable searchParams={filters} />
      </section>
    </main>
  );
}
