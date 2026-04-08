import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { getProfile, requireStaff } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import {
  permitCategories,
  permitKinds,
  permitStatuses,
} from "@/lib/mock-data";
import { createPermit } from "./actions";

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

        <form action={createPermit} className="panel">
          <div>
            <p className="eyebrow">Structured Form</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              신규 허가/신고 등록
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              종류, 구분, 상태는 고정값으로 관리합니다. 등록 후 자동으로 관리번호가 부여됩니다.
            </p>
          </div>

          {error ? (
            <div className="mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              광고주 *
              <input name="advertiser" className="field" placeholder="광고주명 입력" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              종류 *
              <select name="kind" className="field" required>
                {permitKinds.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              구분 *
              <select name="category" className="field" required>
                {permitCategories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
              표시장소 *
              <input name="place" className="field" placeholder="주소 또는 위치 설명" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-3">
              표시내용 *
              <input name="content" className="field" placeholder="표시 내용 입력" required />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              상태 *
              <select name="status" className="field" required>
                {permitStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              수량
              <input name="quantity" type="number" min="1" defaultValue="1" className="field" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              안전점검
              <select name="safety_check" className="field">
                <option value="확인필요">확인필요</option>
                <option value="대상">대상</option>
                <option value="대상아님">대상아님</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              처리일자
              <input name="processed_at" type="date" className="field" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              심의일자
              <input name="hearing_at" type="date" className="field" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              연장대상
              <select name="renewal_target" className="field">
                <option value="연장대상 아님">연장대상 아님</option>
                <option value="연장대상">연장대상</option>
              </select>
            </label>
          </div>

          <div className="mt-8 flex gap-3">
            <button type="submit" className="button-primary" disabled={!envReady}>
              저장
            </button>
            <Link href="/permits" className="button-secondary">
              취소
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
