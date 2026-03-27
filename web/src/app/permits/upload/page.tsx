import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { requireUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { ExcelUploadClient } from "@/components/excel-upload-client";

export default async function UploadPage() {
  const envReady = hasSupabaseEnv();
  const user = await requireUser();

  return (
    <main className="app-frame">
      <NavShell pathname="/permits" />
      <section className="flex flex-col gap-6">
        {!envReady ? <SetupBanner /> : null}
        <AuthStatus email={user?.email} envReady={envReady} />

        <div className="panel">
          <p className="eyebrow">Bulk Import</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            엑셀 일괄 업로드
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            업무일지 엑셀 파일을 선택하면 내용을 미리 확인한 뒤 저장할 수 있습니다.
            헤더 행이 있는 형식(.xlsx)을 지원합니다.
          </p>
        </div>

        <ExcelUploadClient />
      </section>
    </main>
  );
}
