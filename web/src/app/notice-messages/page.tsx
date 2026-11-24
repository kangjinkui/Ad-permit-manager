import type { Metadata } from "next";
import { NavShell } from "@/components/nav-shell";
import { requireStaff } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { NoticeMessageEditor } from "./notice-message-editor";
import { formsUrl } from "./notice-message-templates";

export const metadata: Metadata = {
  title: "민원 안내 문자 | 광고물 허가·신고 관리",
};

export default async function NoticeMessagesPage() {
  const profile = hasSupabaseEnv() ? await requireStaff() : null;

  return (
    <main className="app-frame">
      <NavShell pathname="/notice-messages" profile={profile} />
      <section className="panel flex min-w-0 flex-col gap-6 self-start">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            민원 안내 문자
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            간판 종류를 선택하고 문안을 복사해 문자 앱이나 발송 시스템에 붙여넣으세요.
          </p>
        </header>

        <NoticeMessageEditor />

        <div className="border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">
          <p>
            발송 전 실제 설치 위치·규격과 적용 기준을 확인하고, 필요한 경우 문안을 수정하세요.
          </p>
          <a
            href={formsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-semibold text-blue-700 underline underline-offset-4"
          >
            강남구청 민원서식 및 설치가이드 ↗
          </a>
        </div>
      </section>
    </main>
  );
}
