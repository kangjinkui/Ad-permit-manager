export function SetupBanner() {
  return (
    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
      Supabase 환경 변수가 아직 설정되지 않았습니다. 현재 화면은 샘플 데이터로
      렌더링 중이며, 실제 인증은 `web/.env.local` 설정 후 활성화됩니다.
    </div>
  );
}
