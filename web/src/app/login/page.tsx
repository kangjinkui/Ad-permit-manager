import { AuthStatus } from "@/components/auth-status";
import { SetupBanner } from "@/components/setup-banner";
import { getOptionalUser } from "@/lib/auth";
import { normalizeNextPath } from "@/lib/auth-redirect";
import { hasSupabaseEnv } from "@/lib/env";
import { sendMagicLink } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMessage(error: string | undefined, status: string | undefined) {
  if (error) {
    return {
      tone: "error" as const,
      text: error,
    };
  }

  if (status === "sent") {
    return {
      tone: "success" as const,
      text: "매직링크를 보냈습니다. 받은 편지함에서 로그인 메일을 확인해 주세요.",
    };
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const envReady = hasSupabaseEnv();
  const user = await getOptionalUser();
  const email = getSingleValue(params.email) ?? "";
  const nextPath = normalizeNextPath(getSingleValue(params.next) ?? null);
  const message = getMessage(
    getSingleValue(params.error),
    getSingleValue(params.status),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel-dark flex flex-col justify-between p-8">
          <div>
            <p className="eyebrow-dark">Authentication</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              강남구청 이메일로 바로 로그인합니다.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Supabase 매직링크를 적용해 1차로는 `@gangnam.go.kr` 메일 주소만
              로그인할 수 있게 두고, 이후 필요 시 허용 사용자 목록까지 확장할
              예정입니다.
            </p>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-200">
            로그인 이후에는 전체 허가·신고 목록, 상태 변경 이력 등록, 엑셀 초기
            업로드 결과까지 공통 화면에서 관리하게 됩니다.
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!envReady ? <SetupBanner /> : null}
          <AuthStatus email={user?.email} envReady={envReady} />

          <form action={sendMagicLink} className="panel flex flex-col gap-5 p-8">
            <div>
              <p className="eyebrow">Magic Link</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                이메일 로그인
              </h2>
            </div>

            {message ? (
              <div
                className={
                  message.tone === "error"
                    ? "rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                    : "rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
                }
              >
                {message.text}
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              사내 이메일
              <input
                name="email"
                type="email"
                placeholder="name@gangnam.go.kr"
                defaultValue={email}
                autoComplete="email"
                className="field"
                required
              />
            </label>

            <input type="hidden" name="next" value={nextPath} />

            <button
              type="submit"
              className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!envReady}
            >
              로그인 링크 보내기
            </button>

            <p className="text-sm leading-7 text-slate-500">
              서버 액션에서 메일 주소를 검증한 뒤 Supabase 매직링크를 발송하고,
              메일 클릭 시 세션을 생성해 원래 가려던 화면으로 되돌립니다.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
