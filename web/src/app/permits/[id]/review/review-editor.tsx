"use client";

import { useMemo, useRef, useState } from "react";
import {
  calculateRenewalPeriods,
  completeRenewalPeriods,
  getReviewChecks,
  getReviewFieldKeys,
  getSuggestedCheckValue,
  getUpperWallSizeBand,
  reviewFields,
  reviewStatuses,
  selectReviewTemplate,
  type ReviewDraft,
  type ReviewFieldKey,
  type ReviewStatus,
  type ReviewTemplateId,
} from "@/lib/permit-review";

type Attachment = {
  id: string;
  name: string;
};

type ReviewEditorProps = {
  permitId: string;
  permitKind: string;
  permitCategory: string;
  advertiser: string;
  supported: boolean;
  initialDraft: ReviewDraft;
  initialVersion: string | null;
  initialTemplateId: ReviewTemplateId | null;
  initialAttachments: Attachment[];
};

type Notice = {
  tone: "success" | "error" | "info";
  text: string;
};

type FieldDefinition = {
  label: string;
  type?: "number" | "date" | "textarea" | "select";
  options?: readonly string[];
};

type CheckDefinition = {
  key: string;
  label: string;
  standardText: string;
};

function emptyCheck(): ReviewDraft["checks"][string] {
  return { appliedValue: "", status: "확인필요" };
}

function sanitizeInitialDraft(
  draft: ReviewDraft,
  savedTemplateId: ReviewTemplateId | null,
  permitKind: string,
  permitCategory: string,
): { draft: ReviewDraft; changed: boolean } {
  let fields =
    permitKind === "벽면이용간판" &&
    permitCategory === "연장" &&
    !draft.fields.wallPlacement
      ? { ...draft.fields, wallPlacement: "일반" as const }
      : draft.fields;
  if (permitCategory === "연장") fields = completeRenewalPeriods(fields);
  const selectedTemplateId = selectReviewTemplate(
    permitKind,
    permitCategory,
    fields,
  ).templateId;
  if (!selectedTemplateId || selectedTemplateId !== savedTemplateId) {
    return {
      draft: { ...draft, fields, checks: {} },
      changed: fields !== draft.fields || Object.keys(draft.checks).length > 0,
    };
  }

  const allowedKeys = new Set(
    getReviewChecks(selectedTemplateId, fields).map((check) => check.key),
  );
  const checks: ReviewDraft["checks"] = {};
  let changed = false;
  for (const [key, check] of Object.entries(draft.checks)) {
    if (
      !allowedKeys.has(key) ||
      typeof check?.appliedValue !== "string" ||
      !(reviewStatuses as readonly string[]).includes(check?.status)
    ) {
      changed = true;
      continue;
    }
    checks[key] = {
      appliedValue: check.appliedValue,
      status: check.status,
    };
    if ("evidence" in check) changed = true;
  }

  return {
    draft: changed || fields !== draft.fields ? { ...draft, fields, checks } : draft,
    changed: changed || fields !== draft.fields,
  };
}

async function readApiError(response: Response): Promise<string> {
  let apiMessage: string | undefined;
  try {
    const body = (await response.json()) as { error?: string };
    apiMessage = body.error;
  } catch {
    // JSON 오류 본문이 아니면 상태 코드에 맞는 안내를 사용한다.
  }

  if (
    response.status === 409 &&
    apiMessage &&
    /(다시 열어|새로고침|최신 내용)/.test(apiMessage)
  ) {
    return apiMessage;
  }
  if (response.status === 409) {
    return `${apiMessage ? `${apiMessage} ` : ""}다른 사용자가 저장한 최신 내용을 확인하려면 페이지를 새로고침하세요.`;
  }
  return apiMessage ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.";
}

function downloadName(response: Response, advertiser: string): string {
  const disposition = response.headers.get("content-disposition") ?? "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Name) {
    try {
      return decodeURIComponent(utf8Name);
    } catch {
      return utf8Name;
    }
  }
  return `옥외광고물_검토서_${advertiser}.hwpx`;
}

function FieldControl({
  fieldKey,
  value,
  disabled,
  onChange,
}: {
  fieldKey: ReviewFieldKey;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const definition: FieldDefinition = reviewFields[fieldKey];
  const commonClassName = "field";

  if (definition.type === "select") {
    return (
      <select
        className={commonClassName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">선택하세요</option>
        {definition.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (definition.type === "textarea" || fieldKey === "specification") {
    return (
      <>
        <textarea
          className={`${commonClassName} min-h-28 resize-y`}
          value={value}
          disabled={disabled}
          placeholder={fieldKey === "specification" ? "예) 5.1 × 0.4\n3 × 0.32" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {fieldKey === "specification" ? (
          <span className="text-xs font-normal text-slate-400">
            면별 가로 × 세로(m)를 한 줄씩 입력하세요.
          </span>
        ) : null}
      </>
    );
  }

  return (
    <input
      className={commonClassName}
      type={definition.type === "number" ? "number" : definition.type === "date" ? "date" : "text"}
      step={definition.type === "number" ? "any" : undefined}
      value={value}
      disabled={disabled}
      placeholder={fieldKey === "floor" ? "예: 3층, 옥상" : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function ReviewEditor({
  permitId,
  permitKind,
  permitCategory,
  advertiser,
  supported,
  initialDraft,
  initialVersion,
  initialTemplateId,
  initialAttachments,
}: ReviewEditorProps) {
  const sanitizedInitial = useMemo(
    () =>
      sanitizeInitialDraft(
        initialDraft,
        initialTemplateId,
        permitKind,
        permitCategory,
      ),
    [initialDraft, initialTemplateId, permitCategory, permitKind],
  );
  const [draft, setDraft] = useState(sanitizedInitial.draft);
  const [version, setVersion] = useState(initialVersion);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [dirty, setDirty] = useState(sanitizedInitial.changed);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = saving || generating || uploading || deletingAttachmentId !== null;

  const selection = useMemo(
    () => selectReviewTemplate(permitKind, permitCategory, draft.fields),
    [draft.fields, permitCategory, permitKind],
  );
  const templateId = selection.templateId;
  const checks: CheckDefinition[] = useMemo(
    () => (templateId ? getReviewChecks(templateId, draft.fields) : []),
    [draft.fields, templateId],
  );
  const isWallNew = permitKind === "벽면이용간판" && permitCategory === "신규";
  const isWallRenewal = permitKind === "벽면이용간판" && permitCategory === "연장";
  const hasWallPlacementChoice = isWallNew || isWallRenewal;
  const fieldKeys = useMemo(
    () =>
      getReviewFieldKeys(templateId).filter(
        (fieldKey) =>
          fieldKey !== "wallPlacement" &&
          (!hasWallPlacementChoice ||
            (fieldKey !== "buildingFloors" && fieldKey !== "orientation")),
      ),
    [hasWallPlacementChoice, templateId],
  );
  const wallPlacement = draft.fields.wallPlacement || (isWallRenewal ? "일반" : "");
  const isWallTop = hasWallPlacementChoice && wallPlacement === "상단";
  const upperWallSizeBand = isWallTop
    ? getUpperWallSizeBand(draft.fields.buildingFloors)
    : null;
  const hasUpperWallCriteria =
    !isWallRenewal ||
    !isWallTop ||
    (upperWallSizeBand !== null &&
      (draft.fields.orientation === "가로형" || draft.fields.orientation === "세로형"));
  const displayedTemplateId = templateId ?? (dirty ? null : initialTemplateId);

  function updateField(fieldKey: ReviewFieldKey, value: string) {
    setDraft((current) => {
      const currentSelection = selectReviewTemplate(
        permitKind,
        permitCategory,
        current.fields,
      );
      const fields = { ...current.fields, [fieldKey]: value };
      if (permitCategory === "연장" && fieldKey === "periodBeforeFrom") {
        Object.assign(fields, calculateRenewalPeriods(value));
      }
      const nextSelection = selectReviewTemplate(
        permitKind,
        permitCategory,
        fields,
      );
      const templateChanged =
        currentSelection.templateId !== nextSelection.templateId;

      if (templateChanged) return { fields, checks: {} };
      const wallPlacementChanged =
        fieldKey === "wallPlacement" &&
        (current.fields.wallPlacement || "일반") !== value;
      const upperWallBandChanged =
        fieldKey === "buildingFloors" &&
        getUpperWallSizeBand(current.fields.buildingFloors) !==
          getUpperWallSizeBand(value);
      const upperWallDirectionChanged =
        fieldKey === "orientation" && current.fields.orientation !== value;
      if (
        isWallRenewal &&
        (wallPlacementChanged ||
          ((current.fields.wallPlacement || "일반") === "상단" &&
            (upperWallBandChanged || upperWallDirectionChanged)))
      ) {
        const checks = { ...current.checks };
        delete checks.row6;
        return { fields, checks };
      }
      return { fields, checks: current.checks };
    });
    setDirty(true);
    setNotice(null);
  }

  function updateCheck(
    key: string,
    property: "appliedValue" | "status",
    value: string,
  ) {
    setDraft((current) => {
      const check = current.checks[key] ?? emptyCheck();
      return {
        ...current,
        checks: {
          ...current.checks,
          [key]: {
            ...check,
            [property]:
              property === "status" ? (value as ReviewStatus) : value,
          },
        },
      };
    });
    setDirty(true);
    setNotice(null);
  }

  async function saveDraft(showSuccess = true): Promise<string | null> {
    setSaving(true);
    if (showSuccess) setNotice(null);
    try {
      const response = await fetch(
        `/api/permits/${encodeURIComponent(permitId)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft, version }),
        },
      );
      if (!response.ok) {
        setNotice({ tone: "error", text: await readApiError(response) });
        return null;
      }

      const result = (await response.json()) as {
        version: string;
        templateId: ReviewTemplateId | null;
      };
      setVersion(result.version);
      setDirty(false);
      if (showSuccess) {
        setNotice({ tone: "success", text: "검토서 초안을 저장했습니다." });
      }
      return result.version;
    } catch {
      setNotice({
        tone: "error",
        text: "서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 다시 시도하세요.",
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setNotice(null);
    try {
      const savedVersion = !dirty && version ? version : await saveDraft(false);
      if (!savedVersion) return;

      const response = await fetch(
        `/api/permits/${encodeURIComponent(permitId)}/review/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: savedVersion }),
        },
      );
      if (!response.ok) {
        setNotice({ tone: "error", text: await readApiError(response) });
        return;
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName(response, advertiser);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000);
      setNotice({
        tone: "success",
        text: "최신 초안을 저장하고 HWPX 파일을 생성했습니다.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "문서 생성 요청 중 연결이 끊겼습니다. 다시 시도하세요.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setNotice(null);
    try {
      const savedVersion = dirty || !version ? await saveDraft(false) : version;
      if (!savedVersion) return;

      const body = new FormData();
      body.append("file", file);
      const response = await fetch(
        `/api/permits/${encodeURIComponent(permitId)}/review/attachments`,
        { method: "POST", body },
      );
      if (!response.ok) {
        setNotice({ tone: "error", text: await readApiError(response) });
        return;
      }

      const attachment = (await response.json()) as Attachment;
      setAttachments((current) => [...current, attachment]);
      setNotice({ tone: "success", text: `${attachment.name} 파일을 첨부했습니다.` });
    } catch {
      setNotice({
        tone: "error",
        text: "첨부 파일 업로드 중 연결이 끊겼습니다. 다시 시도하세요.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAttachment(attachment: Attachment) {
    if (!window.confirm(`${attachment.name} 파일을 삭제할까요?`)) return;
    setDeletingAttachmentId(attachment.id);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/permits/${encodeURIComponent(permitId)}/review/attachments/${encodeURIComponent(attachment.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setNotice({ tone: "error", text: await readApiError(response) });
        return;
      }
      setAttachments((current) =>
        current.filter((item) => item.id !== attachment.id),
      );
      setNotice({ tone: "success", text: `${attachment.name} 파일을 삭제했습니다.` });
    } catch {
      setNotice({
        tone: "error",
        text: "첨부 파일 삭제 중 연결이 끊겼습니다. 다시 시도하세요.",
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  if (!supported) {
    return (
      <article className="panel">
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          지원되지 않는 검토서 유형
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {permitKind} · {permitCategory} 조합에 해당하는 원본 서식이 없습니다.
          허가 상세에서 종류와 구분을 확인하세요.
        </p>
      </article>
    );
  }

  const noticeTone = notice?.tone === "error"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : notice?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <>
      <article className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              옥외광고물 검토서
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {permitKind} · {permitCategory} · {advertiser}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              {templateId
                ? `${templateId} 서식${isWallRenewal ? ` · ${wallPlacement}간판` : ""}`
                : "서식 선택 필요"}
            </span>
            {dirty ? (
              <span className="text-xs font-medium text-amber-600">저장되지 않은 변경</span>
            ) : version ? (
              <span className="text-xs text-slate-400">저장됨</span>
            ) : null}
          </div>
        </div>

        {hasWallPlacementChoice ? (
          <section className="mt-8 rounded-[24px] border border-sky-200 bg-sky-50/70 p-5">
            <h2 className="text-lg font-semibold text-slate-900">벽면 간판 분류</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isWallRenewal
                ? "일반간판과 상단간판 중 실제 설치 형태를 선택하세요. 선택한 형태가 검토서와 규격 기준에 반영됩니다."
                : "설치 위치와 건물 층수, 방향에 따라 검토서 서식이 결정됩니다."}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                {reviewFields.wallPlacement.label}
                <FieldControl
                  fieldKey={"wallPlacement" as ReviewFieldKey}
                  value={wallPlacement}
                  disabled={busy}
                  onChange={(value) => updateField("wallPlacement", value || (isWallRenewal ? "일반" : ""))}
                />
              </label>
              {isWallTop ? (
                <>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {reviewFields.buildingFloors.label}
                    <FieldControl
                      fieldKey={"buildingFloors" as ReviewFieldKey}
                      value={draft.fields.buildingFloors ?? ""}
                      disabled={busy}
                      onChange={(value) => updateField("buildingFloors" as ReviewFieldKey, value)}
                    />
                    {upperWallSizeBand ? (
                      <span className="text-xs font-normal text-sky-700">
                        {upperWallSizeBand} 상단간판 규격 기준 적용
                      </span>
                    ) : (
                      <span className="text-xs font-normal text-amber-700">
                        건물 전체 층수를 입력하면 적용할 규격 기준이 결정됩니다.
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    {reviewFields.orientation.label}
                    <FieldControl
                      fieldKey={"orientation" as ReviewFieldKey}
                      value={draft.fields.orientation ?? ""}
                      disabled={busy}
                      onChange={(value) => updateField("orientation" as ReviewFieldKey, value)}
                    />
                  </label>
                </>
              ) : null}
            </div>
            {isWallRenewal && isWallTop && !hasUpperWallCriteria ? (
              <p className="mt-4 text-sm font-medium text-amber-800">
                HWPX를 생성하려면 건물 전체 층수와 표시 방향을 입력하세요.
              </p>
            ) : null}
          </section>
        ) : null}

        {selection.error ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {selection.error}
          </p>
        ) : null}

        {templateId === "T02" ? (
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            T02 원본의 규격 허가기준 문구는 가로형 기준으로 기재되어 있습니다. 실제 적용 기준을 확인한 뒤 신청내용과 판정을 입력하세요.
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fieldKeys.map((fieldKey) => (
              <label
                key={fieldKey}
                className={`flex flex-col gap-2 text-sm font-medium text-slate-700 ${
                  (reviewFields[fieldKey] as FieldDefinition).type === "textarea" ||
                  fieldKey === "specification"
                    ? "md:col-span-2 xl:col-span-3"
                    : ""
                }`}
              >
                {reviewFields[fieldKey].label}
                <FieldControl
                  fieldKey={fieldKey}
                  value={draft.fields[fieldKey] ?? ""}
                  disabled={busy}
                  onChange={(value) => updateField(fieldKey, value)}
                />
                {permitCategory === "연장" && fieldKey === "periodBeforeFrom" ? (
                  <span className="text-xs font-normal text-slate-400">
                    시작일을 입력하면 기존 종료일과 3년 연장 기간이 자동으로 입력됩니다.
                  </span>
                ) : null}
              </label>
            ))}
          </div>
      </article>

      {templateId ? (
        <article className="panel">
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            점검 항목
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            허가기준을 확인하고 신청내용과 판정을 기록하세요. 기본 판정은 확인필요입니다.
          </p>
          <div className="mt-6 space-y-4">
            {checks.map((check, index) => {
              const value = draft.checks[check.key] ?? emptyCheck();
              const suggestedValue = getSuggestedCheckValue(
                templateId,
                check.key,
                draft.fields,
              );
              return (
                <section
                  key={check.key}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{check.label}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {check.standardText}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      신청내용{suggestedValue ? " (비워두면 자동 입력)" : ""}
                      <textarea
                        className="field min-h-24 resize-y"
                        value={value.appliedValue}
                        placeholder={suggestedValue || undefined}
                        disabled={busy}
                        onChange={(event) =>
                          updateCheck(check.key, "appliedValue", event.target.value)
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      검토결과
                      <select
                        className="field"
                        value={value.status}
                        disabled={busy}
                        onChange={(event) =>
                          updateCheck(check.key, "status", event.target.value)
                        }
                      >
                        {reviewStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      ) : null}

      <article className="panel">
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          첨부 사진
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          초안을 저장한 뒤 사진을 첨부할 수 있습니다. 내용변경 검토서에는 첨부 파일명이 표시됩니다.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block max-w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            disabled={busy}
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
          {uploading ? <span className="text-sm text-sky-600">업로드 중…</span> : null}
        </div>
        {attachments.length > 0 ? (
          <ul className="mt-5 divide-y divide-slate-100 rounded-[20px] border border-slate-200 bg-white px-4">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-4 py-3">
                <a
                  href={`/api/permits/${encodeURIComponent(permitId)}/review/attachments/${encodeURIComponent(attachment.id)}`}
                  className="min-w-0 truncate text-sm font-medium text-sky-700 underline decoration-sky-200 underline-offset-4 hover:text-sky-900"
                >
                  {attachment.name}
                </a>
                <button
                  type="button"
                  className="shrink-0 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => handleDeleteAttachment(attachment)}
                >
                  {deletingAttachmentId === attachment.id ? "삭제 중…" : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-sm text-slate-400">첨부된 사진이 없습니다.</p>
        )}
      </article>

      <article className="panel sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 border-slate-300 shadow-xl">
        <div className="min-w-0 flex-1">
          {notice ? (
            <p className={`rounded-2xl border px-4 py-3 text-sm ${noticeTone}`} role="status">
              {notice.text}
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              {displayedTemplateId ? `${displayedTemplateId} 서식` : "서식 미선택"} · 생성 전 최신 변경사항을 자동 저장합니다.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button-secondary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => saveDraft()}
          >
            {saving ? "저장 중…" : "초안 저장"}
          </button>
          <button
            type="button"
            className="button-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy || !templateId || !hasUpperWallCriteria}
            onClick={handleGenerate}
          >
            {generating ? "문서 생성 중…" : "HWPX 다운로드"}
          </button>
        </div>
      </article>
    </>
  );
}
