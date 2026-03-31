"use client";

import { useTransition, useState } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  successMessage?: string;
  className?: string;
};

export function FormWithToast({
  action,
  children,
  successMessage = "저장되었습니다.",
  className,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<"success" | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await action(formData);
      setToast("success");
      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={className}>
        {/* 로딩 중 버튼 비활성화를 위해 pending 상태 전달 */}
        <fieldset disabled={isPending} style={{ all: "unset", display: "contents" }}>
          {children}
        </fieldset>
      </form>

      {/* Toast */}
      {toast === "success" && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[20px] bg-slate-900 px-5 py-4 text-sm font-medium text-white shadow-xl"
        >
          <svg
            className="h-5 w-5 shrink-0 text-emerald-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
              clipRule="evenodd"
            />
          </svg>
          {successMessage}
        </div>
      )}
    </>
  );
}
