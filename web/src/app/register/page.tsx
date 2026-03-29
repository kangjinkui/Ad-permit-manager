import Link from "next/link";
import { SetupBanner } from "@/components/setup-banner";
import { hasSupabaseEnv } from "@/lib/env";
import { signUp } from "./actions";

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = (await searchParams) ?? {};
  const envReady = hasSupabaseEnv();
  const email = getSingleValue(params.email) ?? "";
  const errorMessage = getSingleValue(params.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel-dark flex flex-col justify-between p-8">
          <div>
            <p className="eyebrow-dark">Sign Up</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              회원가입
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              이름과 이메일, 비밀번호만으로 간편하게 가입할 수 있습니다.
              가입 후 관리자 승인이 완료되면 시스템을 이용할 수 있습니다.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-200">
            승인 절차가 있으므로 즉시 로그인되지 않습니다. 관리자가 가입
            요청을 검토한 후 승인하면 이메일로 안내받게 됩니다.
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!envReady ? <SetupBanner /> : null}

          <form action={signUp} className="panel flex flex-col gap-5 p-8">
            <div>
              <p className="eyebrow">Register</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                계정 만들기
              </h2>
            </div>

            {errorMessage ? (
              <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              이름
              <input
                name="name"
                type="text"
                placeholder="홍길동"
                autoComplete="name"
                className="field"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              이메일
              <input
                name="email"
                type="email"
                placeholder="name@example.com"
                defaultValue={email}
                autoComplete="email"
                className="field"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              비밀번호
              <input
                name="password"
                type="password"
                placeholder="8자 이상"
                autoComplete="new-password"
                className="field"
                required
                minLength={8}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              비밀번호 확인
              <input
                name="passwordConfirm"
                type="password"
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                className="field"
                required
              />
            </label>

            <button
              type="submit"
              className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!envReady}
            >
              가입 신청
            </button>

            <p className="text-center text-sm text-slate-500">
              이미 계정이 있으신가요?{" "}
              <Link
                href="/login"
                className="font-medium text-sky-600 hover:underline"
              >
                로그인
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
