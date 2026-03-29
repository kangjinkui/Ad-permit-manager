import { getOptionalUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";

export default async function PendingPage() {
  const user = await getOptionalUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <section className="mx-auto w-full max-w-md">
        <div className="panel flex flex-col gap-6 p-8">
          <div>
            <p className="eyebrow">Pending Approval</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              승인 대기 중
            </h1>
          </div>

          <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
            <p className="font-semibold">가입 신청이 완료되었습니다.</p>
            <p className="mt-1">
              관리자가 계정을 승인하면 로그인할 수 있습니다. 승인까지 다소
              시간이 걸릴 수 있습니다.
            </p>
          </div>

          {user?.email ? (
            <p className="text-sm text-slate-500">
              신청 이메일:{" "}
              <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          ) : null}

          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              로그아웃
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
