import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { getProfile, requireStaff } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { NewPermitForm } from "./new-permit-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPermitPage({ searchParams }: PageProps) {
  const envReady = hasSupabaseEnv();
  const profile = envReady ? await requireStaff() : await getProfile();
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="app-frame">
      <NavShell pathname="/permits/new" profile={profile} />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={profile?.email} envReady={envReady} />

        <NewPermitForm envReady={envReady} error={error} />
      </section>
    </main>
  );
}
