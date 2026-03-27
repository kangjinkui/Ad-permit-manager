type AuthStatusProps = {
  email?: string | null;
  envReady: boolean;
};

export function AuthStatus({ email, envReady }: AuthStatusProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-700">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Session Status
      </p>
      <p className="mt-2">
        {envReady
          ? email
            ? `로그인 사용자: ${email}`
            : "현재 로그인 세션이 없습니다."
          : "Supabase env 미설정 상태입니다."}
      </p>
    </div>
  );
}
