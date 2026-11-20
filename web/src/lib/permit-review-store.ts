import { createClient } from "@/lib/supabase/server";
import { reviewTemplateVersion } from "@/lib/permit-review";
import type { ReviewDraft, ReviewTemplateId } from "@/lib/permit-review";

const ATTACHMENT_BUCKET = "permit-review-attachments";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type PermitReviewAttachment = {
  id: string;
  name: string;
};

export type PermitReviewDownload = PermitReviewAttachment & {
  data: Blob;
  contentType: string;
};

type ReviewRow = {
  id: string;
  draft: ReviewDraft;
  version: string;
  template_id: ReviewTemplateId | null;
  template_version: number;
};

type AttachmentRow = {
  id: string;
  object_path: string;
  original_name: string;
  content_type: string;
};

export class PermitReviewStoreError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "SCHEMA_UNAVAILABLE"
      | "NOT_FOUND"
      | "INVALID_ATTACHMENT"
      | "ATTACHMENT_IN_PROGRESS"
      | "DATABASE_FAILURE"
      | "STORAGE_FAILURE",
  ) {
    super(message);
    this.name = "PermitReviewStoreError";
  }
}

export function isPermitReviewAttachmentConstraint(error: { code: string; message: string } | null): boolean {
  return Boolean(error && (error.code === "23001" || error.code === "23503") &&
    error.message.includes("permit_review_attachments"));
}

function databaseError(message: string, error: { code?: string; message: string }) {
  const schemaUnavailable =
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205";

  return new PermitReviewStoreError(
    schemaUnavailable
      ? "검토서 저장소가 준비되지 않았습니다. Supabase 마이그레이션 13을 적용해 주세요."
      : `${message}: ${error.message}`,
    schemaUnavailable ? "SCHEMA_UNAVAILABLE" : "DATABASE_FAILURE",
  );
}

async function getReviewRow(permitId: string): Promise<ReviewRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_reviews")
    .select("id, draft, version, template_id, template_version")
    .eq("permit_record_no", permitId)
    .maybeSingle();

  if (error) throw databaseError("검토서를 불러오지 못했습니다", error);
  return (data as ReviewRow | null) ?? null;
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new PermitReviewStoreError("로그인 정보를 확인할 수 없습니다.", "DATABASE_FAILURE");
  }

  return user.id;
}

export async function getPermitReview(permitId: string): Promise<{
  draft: ReviewDraft;
  version: string;
  templateId: ReviewTemplateId | null;
  templateVersion: number;
} | null> {
  const row = await getReviewRow(permitId);
  if (!row) return null;

  return {
    draft: row.draft,
    version: row.version,
    templateId: row.template_id,
    templateVersion: row.template_version,
  };
}

export async function savePermitReview(
  permitId: string,
  normalizedDraft: ReviewDraft,
  templateId: ReviewTemplateId | null,
  expectedVersion: string | null,
  profileId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const nextVersion = crypto.randomUUID();

  if (expectedVersion === null) {
    const { data, error } = await supabase
      .from("permit_reviews")
      .insert({
        permit_record_no: permitId,
        template_id: templateId,
        template_version: reviewTemplateVersion,
        draft: normalizedDraft,
        version: nextVersion,
        created_by: profileId,
        updated_by: profileId,
      })
      .select("version")
      .maybeSingle();

    if (error?.code === "23505") return null;
    if (error) throw databaseError("검토서를 저장하지 못했습니다", error);
    return (data as { version: string } | null)?.version ?? null;
  }

  const { data, error } = await supabase
    .from("permit_reviews")
    .update({
      template_id: templateId,
      template_version: reviewTemplateVersion,
      draft: normalizedDraft,
      version: nextVersion,
      updated_by: profileId,
    })
    .eq("permit_record_no", permitId)
    .eq("version", expectedVersion)
    .select("version")
    .maybeSingle();

  if (error) throw databaseError("검토서를 저장하지 못했습니다", error);
  return (data as { version: string } | null)?.version ?? null;
}

export async function listReviewAttachments(
  permitId: string,
): Promise<PermitReviewAttachment[]> {
  const review = await getReviewRow(permitId);
  if (!review) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_review_attachments")
    .select("id, original_name")
    .eq("review_id", review.id)
    .eq("state", "ready")
    .order("created_at");

  if (error) throw databaseError("첨부 목록을 불러오지 못했습니다", error);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.original_name as string,
  }));
}

export async function uploadReviewAttachment(
  permitId: string,
  file: Blob,
  originalName: string,
): Promise<PermitReviewAttachment> {
  const review = await getReviewRow(permitId);
  if (!review) {
    throw new PermitReviewStoreError("첨부 전에 검토서를 먼저 저장해 주세요.", "NOT_FOUND");
  }

  const cleanName = originalName.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const extension = ATTACHMENT_EXTENSIONS[file.type];
  if (!cleanName || cleanName.length > 255) {
    throw new PermitReviewStoreError("첨부 파일 이름은 1~255자여야 합니다.", "INVALID_ATTACHMENT");
  }
  if (!extension) {
    throw new PermitReviewStoreError(
      "JPG, PNG, WebP 이미지만 첨부할 수 있습니다.",
      "INVALID_ATTACHMENT",
    );
  }
  if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) {
    throw new PermitReviewStoreError(
      "첨부 파일은 5MB 이하여야 합니다.",
      "INVALID_ATTACHMENT",
    );
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId();
  const attachmentId = crypto.randomUUID();
  const objectPath = `${review.id}/${attachmentId}${extension}`;
  const { error: insertError } = await supabase
    .from("permit_review_attachments")
    .insert({
      id: attachmentId,
      review_id: review.id,
      object_path: objectPath,
      original_name: cleanName,
      content_type: file.type,
      size_bytes: file.size,
      state: "pending",
      created_by: userId,
    });

  if (insertError) throw databaseError("첨부 정보를 저장하지 못했습니다", insertError);

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(objectPath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    const { error: storageRollbackError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([objectPath]);
    if (storageRollbackError) {
      throw new PermitReviewStoreError(
        `첨부 업로드와 파일 정리에 실패했습니다: ${uploadError.message}; ${storageRollbackError.message}`,
        "STORAGE_FAILURE",
      );
    }

    const { error: rollbackError } = await supabase
      .from("permit_review_attachments")
      .delete()
      .eq("id", attachmentId);
    const rollbackMessage = rollbackError ? ` 메타데이터 정리도 실패했습니다: ${rollbackError.message}` : "";
    throw new PermitReviewStoreError(
      `첨부 파일을 업로드하지 못했습니다: ${uploadError.message}.${rollbackMessage}`,
      "STORAGE_FAILURE",
    );
  }

  const { data: finalized, error: finalizeError } = await supabase
    .from("permit_review_attachments")
    .update({ state: "ready" })
    .eq("id", attachmentId)
    .eq("state", "pending")
    .select("id")
    .maybeSingle();
  if (finalizeError || !finalized) {
    const { error: storageRollbackError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([objectPath]);
    if (!storageRollbackError) {
      await supabase.from("permit_review_attachments").delete().eq("id", attachmentId);
    }
    const reason = finalizeError?.message ?? "업로드 상태가 변경되었습니다.";
    throw new PermitReviewStoreError(
      `첨부 업로드를 완료하지 못했습니다: ${reason}`,
      storageRollbackError ? "STORAGE_FAILURE" : "DATABASE_FAILURE",
    );
  }

  return { id: attachmentId, name: cleanName };
}

async function getAttachmentRow(
  permitId: string,
  attachmentId: string,
): Promise<AttachmentRow> {
  const review = await getReviewRow(permitId);
  if (!review) throw new PermitReviewStoreError("검토서를 찾을 수 없습니다.", "NOT_FOUND");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_review_attachments")
    .select("id, object_path, original_name, content_type")
    .eq("id", attachmentId)
    .eq("review_id", review.id)
    .eq("state", "ready")
    .maybeSingle();

  if (error) throw databaseError("첨부 정보를 불러오지 못했습니다", error);
  if (!data) throw new PermitReviewStoreError("첨부 파일을 찾을 수 없습니다.", "NOT_FOUND");
  return data as AttachmentRow;
}

export async function downloadReviewAttachment(
  permitId: string,
  attachmentId: string,
): Promise<PermitReviewDownload> {
  const attachment = await getAttachmentRow(permitId, attachmentId);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .download(attachment.object_path);

  if (error || !data) {
    throw new PermitReviewStoreError(
      `첨부 파일을 내려받지 못했습니다${error ? `: ${error.message}` : "."}`,
      "STORAGE_FAILURE",
    );
  }

  return {
    id: attachment.id,
    name: attachment.original_name,
    contentType: attachment.content_type,
    data,
  };
}

export async function deleteReviewAttachment(
  permitId: string,
  attachmentId: string,
): Promise<void> {
  const attachment = await getAttachmentRow(permitId, attachmentId);
  const supabase = await createClient();
  const { error: storageError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachment.object_path]);
  if (storageError) {
    throw new PermitReviewStoreError(
      `첨부 파일을 삭제하지 못했습니다: ${storageError.message}`,
      "STORAGE_FAILURE",
    );
  }

  const { error } = await supabase
    .from("permit_review_attachments")
    .delete()
    .eq("id", attachment.id);
  if (error) throw databaseError("첨부 정보를 삭제하지 못했습니다", error);
}

export async function cleanupReviewAttachments(permitId: string): Promise<void> {
  let review: ReviewRow | null;
  try {
    review = await getReviewRow(permitId);
  } catch (error) {
    if (error instanceof PermitReviewStoreError && error.code === "SCHEMA_UNAVAILABLE") return;
    throw error;
  }
  if (!review) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permit_review_attachments")
    .select("id, object_path, state, created_at")
    .eq("review_id", review.id);
  if (error) throw databaseError("첨부 정보를 불러오지 못했습니다", error);
  if (!data?.length) return;

  const stalePendingThreshold = Date.now() - 15 * 60 * 1000;
  const eligible = data.filter(
    (row) =>
      row.state === "ready" ||
      (row.state === "pending" && Date.parse(row.created_at as string) < stalePendingThreshold),
  );
  if (eligible.length !== data.length) {
    throw new PermitReviewStoreError(
      "첨부 파일 업로드가 진행 중입니다. 완료된 뒤 다시 시도해 주세요.",
      "ATTACHMENT_IN_PROGRESS",
    );
  }
  const paths = eligible.map((row) => row.object_path as string);
  const { error: storageError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove(paths);
  if (storageError) {
    throw new PermitReviewStoreError(
      `첨부 파일 정리에 실패했습니다: ${storageError.message}`,
      "STORAGE_FAILURE",
    );
  }

  const ids = eligible.map((row) => row.id as string);
  const { error: deleteError } = await supabase
    .from("permit_review_attachments")
    .delete()
    .in("id", ids);
  if (deleteError) throw databaseError("첨부 정보를 정리하지 못했습니다", deleteError);
}
