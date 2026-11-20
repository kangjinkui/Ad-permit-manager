import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthStatus } from "@/components/auth-status";
import { NavShell } from "@/components/nav-shell";
import { requireStaff } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createReviewDraft, supportsPermitReview } from "@/lib/permit-review";
import {
  getPermitReview,
  listReviewAttachments,
  PermitReviewStoreError,
} from "@/lib/permit-review-store";
import { getPermit } from "@/lib/permits";
import { ReviewEditor } from "./review-editor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PermitReviewPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await requireStaff();
  const permit = await getPermit(id);

  if (!permit) notFound();

  let savedReview: Awaited<ReturnType<typeof getPermitReview>> = null;
  let attachments: Awaited<ReturnType<typeof listReviewAttachments>> = [];
  let storageError: string | null = null;
  try {
    [savedReview, attachments] = await Promise.all([
      getPermitReview(id),
      listReviewAttachments(id),
    ]);
  } catch (error) {
    if (
      error instanceof PermitReviewStoreError &&
      error.code === "SCHEMA_UNAVAILABLE"
    ) {
      storageError = error.message;
    } else {
      throw error;
    }
  }
  const reviewer = profile.name;
  const initialDraft =
    savedReview?.draft ?? createReviewDraft(permit, reviewer);
  const supported = supportsPermitReview(permit.kind, permit.category);

  return (
    <main className="app-frame">
      <NavShell pathname="/permits" profile={profile} />
      <section className="flex min-w-0 flex-col gap-6">
        <AuthStatus email={profile.email} envReady={hasSupabaseEnv()} />

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={`/permits/${encodeURIComponent(permit.id)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 active:scale-95"
          >
            ← 허가 상세
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-700">
            {permit.advertiser} 검토서
          </span>
        </div>

        {storageError ? (
          <article className="panel">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              검토서 저장소 설정이 필요합니다
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {storageError}
            </p>
          </article>
        ) : (
          <ReviewEditor
            permitId={permit.id}
            permitKind={permit.kind}
            permitCategory={permit.category}
            advertiser={permit.advertiser}
            supported={supported}
            initialDraft={initialDraft}
            initialVersion={savedReview?.version ?? null}
            initialTemplateId={savedReview?.templateId ?? null}
            initialAttachments={attachments}
          />
        )}
      </section>
    </main>
  );
}
