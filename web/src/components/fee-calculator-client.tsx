"use client";

import type { Dispatch, SetStateAction } from "react";
import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyFeeCalculationToPermit,
  saveFeeCalculation,
} from "@/app/fees/actions";
import type { PermitWithStaff } from "@/lib/permits";
import {
  calculateFeeResult,
  createDefaultFeeInput,
  feeSignTypeOptions,
  formatWon,
  getCategoryDisplayLabel,
  getFeeSignTypeLabel,
  getSafetyCheckDisplayLabel,
  getSupportedFeeSignTypesForPermitKind,
  isFeeSignTypeCompatible,
  type FeeCalculationInput,
  type FeeSignType,
  type PublicFacilityFaceInput,
  type RooftopFaceInput,
} from "@/lib/fees";

type Props = {
  permits: PermitWithStaff[];
};

type FeedbackState =
  | { tone: "success" | "error"; text: string }
  | null;

function toNumber(value: string): number {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function findPermitById(permits: PermitWithStaff[], permitId: string) {
  return permits.find((permit) => permit.id === permitId) ?? null;
}

function updatePublicFacilityFace(
  input: FeeCalculationInput,
  index: number,
  patch: Partial<PublicFacilityFaceInput>,
): FeeCalculationInput {
  if (input.signType !== "public_facility_general") return input;
  return {
    ...input,
    faces: input.faces.map((face, faceIndex) =>
      faceIndex === index ? { ...face, ...patch } : face,
    ),
  };
}

function updateRooftopFace(
  input: FeeCalculationInput,
  index: number,
  patch: Partial<RooftopFaceInput>,
): FeeCalculationInput {
  if (input.signType !== "rooftop_large") return input;
  return {
    ...input,
    faces: input.faces.map((face, faceIndex) =>
      faceIndex === index ? { ...face, ...patch } : face,
    ),
  };
}

function renderFeeFields(
  input: FeeCalculationInput,
  setInput: Dispatch<SetStateAction<FeeCalculationInput>>,
) {
  switch (input.signType) {
    case "wall_general":
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            구분
            <select
              className="field"
              value={input.shapeType}
              onChange={(event) =>
                setInput({ ...input, shapeType: event.target.value as typeof input.shapeType })
              }
            >
              <option value="판류형">판류형</option>
              <option value="입체형">입체형</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            광고유형
            <select
              className="field"
              value={input.adOwnerType}
              onChange={(event) =>
                setInput({ ...input, adOwnerType: event.target.value as typeof input.adOwnerType })
              }
            >
              <option value="자사광고">자사광고</option>
              <option value="타사광고">타사광고</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            조명유형
            <select
              className="field"
              value={input.illuminationType}
              onChange={(event) =>
                setInput({
                  ...input,
                  illuminationType: event.target.value as typeof input.illuminationType,
                })
              }
            >
              <option value="비조명">비조명</option>
              <option value="내부조명">내부조명</option>
              <option value="외부조명">외부조명</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            가로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.width || ""}
              onChange={(event) => setInput({ ...input, width: toNumber(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            세로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.height || ""}
              onChange={(event) => setInput({ ...input, height: toNumber(event.target.value) })}
            />
          </label>
        </div>
      );
    case "wall_large":
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            광고유형
            <select
              className="field"
              value={input.adOwnerType}
              onChange={(event) =>
                setInput({ ...input, adOwnerType: event.target.value as typeof input.adOwnerType })
              }
            >
              <option value="자사광고">자사광고</option>
              <option value="타사광고">타사광고</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            허가 조명유형
            <select
              className="field"
              value={input.permitIlluminationType}
              onChange={(event) =>
                setInput({
                  ...input,
                  permitIlluminationType: event.target.value as typeof input.permitIlluminationType,
                })
              }
            >
              <option value="비조명">비조명</option>
              <option value="내부조명">내부조명</option>
              <option value="외부조명">외부조명</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            안전점검 조명유형
            <select
              className="field"
              value={input.safetyIlluminationType}
              onChange={(event) =>
                setInput({
                  ...input,
                  safetyIlluminationType: event.target.value as typeof input.safetyIlluminationType,
                })
              }
            >
              <option value="비조명">비조명</option>
              <option value="내부조명">내부조명</option>
              <option value="외부조명">외부조명</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            가로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.width || ""}
              onChange={(event) => setInput({ ...input, width: toNumber(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            세로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.height || ""}
              onChange={(event) => setInput({ ...input, height: toNumber(event.target.value) })}
            />
          </label>
        </div>
      );
    case "banner_frame_general":
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            광고유형
            <select
              className="field"
              value={input.adOwnerType}
              onChange={(event) =>
                setInput({ ...input, adOwnerType: event.target.value as typeof input.adOwnerType })
              }
            >
              <option value="자사광고">자사광고</option>
              <option value="타사광고">타사광고</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            조명유형
            <select
              className="field"
              value={input.illuminationType}
              onChange={(event) =>
                setInput({
                  ...input,
                  illuminationType: event.target.value as typeof input.illuminationType,
                })
              }
            >
              <option value="비조명">비조명</option>
              <option value="내부조명">내부조명</option>
              <option value="외부조명">외부조명</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            가로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.width || ""}
              onChange={(event) => setInput({ ...input, width: toNumber(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            세로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.height || ""}
              onChange={(event) => setInput({ ...input, height: toNumber(event.target.value) })}
            />
          </label>
        </div>
      );
    case "projection_general":
    case "pylon_general":
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            가로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.width || ""}
              onChange={(event) => setInput({ ...input, width: toNumber(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            세로 (m)
            <input
              className="field"
              type="number"
              min="0"
              step="0.001"
              value={input.height || ""}
              onChange={(event) => setInput({ ...input, height: toNumber(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            면수
            <input
              className="field"
              type="number"
              min="1"
              step="1"
              value={input.faceCount || ""}
              onChange={(event) =>
                setInput({ ...input, faceCount: Math.max(1, toNumber(event.target.value)) })
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            조명유형
            <select
              className="field"
              value={input.illuminationType}
              onChange={(event) =>
                setInput({
                  ...input,
                  illuminationType: event.target.value as typeof input.illuminationType,
                })
              }
            >
              <option value="비조명">비조명</option>
              <option value="내부조명">내부조명</option>
              <option value="외부조명">외부조명</option>
            </select>
          </label>
        </div>
      );
    case "public_facility_general":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">면별 입력</p>
              <p className="text-sm text-slate-500">각 면의 가로, 높이, 조명유형을 입력합니다.</p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                setInput({
                  ...input,
                  faces: [...input.faces, { width: 0, height: 0, illuminationType: "비조명" }],
                })
              }
            >
              면 추가
            </button>
          </div>
          {input.faces.map((face, index) => (
            <div
              key={`public-face-${index}`}
              className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
            >
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                가로 (m)
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.001"
                  value={face.width || ""}
                  onChange={(event) =>
                    setInput((current) =>
                      updatePublicFacilityFace(current, index, {
                        width: toNumber(event.target.value),
                      }),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                높이 (m)
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.001"
                  value={face.height || ""}
                  onChange={(event) =>
                    setInput((current) =>
                      updatePublicFacilityFace(current, index, {
                        height: toNumber(event.target.value),
                      }),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                조명유형
                <select
                  className="field"
                  value={face.illuminationType}
                  onChange={(event) =>
                    setInput((current) =>
                      updatePublicFacilityFace(current, index, {
                        illuminationType: event.target.value as typeof face.illuminationType,
                      }),
                    )
                  }
                >
                  <option value="비조명">비조명</option>
                  <option value="내부조명">내부조명</option>
                  <option value="외부조명">외부조명</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="button-secondary w-full"
                  disabled={input.faces.length <= 1}
                  onClick={() =>
                    setInput({
                      ...input,
                      faces: input.faces.filter((_, faceIndex) => faceIndex !== index),
                    })
                  }
                >
                  면 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    case "rooftop_large":
      return (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">면별 입력</p>
              <p className="text-sm text-slate-500">
                허가 높이와 안전 추가 높이를 같은 면 단위로 입력합니다.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary"
              onClick={() =>
                setInput({
                  ...input,
                  faces: [
                    ...input.faces,
                    {
                      width: 0,
                      panelHeight: 0,
                      extraHeightForSafety: 0,
                      illuminationType: "비조명",
                    },
                  ],
                })
              }
            >
              면 추가
            </button>
          </div>
          {input.faces.map((face, index) => (
            <div
              key={`rooftop-face-${index}`}
              className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-5"
            >
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                가로 (m)
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.001"
                  value={face.width || ""}
                  onChange={(event) =>
                    setInput((current) =>
                      updateRooftopFace(current, index, { width: toNumber(event.target.value) }),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                판 높이 (m)
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.001"
                  value={face.panelHeight || ""}
                  onChange={(event) =>
                    setInput((current) =>
                      updateRooftopFace(current, index, {
                        panelHeight: toNumber(event.target.value),
                      }),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                안전 추가 높이 (m)
                <input
                  className="field"
                  type="number"
                  min="0"
                  step="0.001"
                  value={face.extraHeightForSafety || ""}
                  onChange={(event) =>
                    setInput((current) =>
                      updateRooftopFace(current, index, {
                        extraHeightForSafety: toNumber(event.target.value),
                      }),
                    )
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                조명유형
                <select
                  className="field"
                  value={face.illuminationType}
                  onChange={(event) =>
                    setInput((current) =>
                      updateRooftopFace(current, index, {
                        illuminationType: event.target.value as typeof face.illuminationType,
                      }),
                    )
                  }
                >
                  <option value="비조명">비조명</option>
                  <option value="내부조명">내부조명</option>
                  <option value="외부조명">외부조명</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="button-secondary w-full"
                  disabled={input.faces.length <= 1}
                  onClick={() =>
                    setInput({
                      ...input,
                      faces: input.faces.filter((_, faceIndex) => faceIndex !== index),
                    })
                  }
                >
                  면 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      );
  }
}

export function FeeCalculatorClient({ permits }: Props) {
  const router = useRouter();
  const [input, setInput] = useState<FeeCalculationInput>(createDefaultFeeInput("wall_general"));
  const [permitQuery, setPermitQuery] = useState("");
  const [selectedPermitId, setSelectedPermitId] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const deferredPermitQuery = useDeferredValue(permitQuery);
  const [isSaving, startSaving] = useTransition();
  const [isApplying, startApplying] = useTransition();

  const selectedPermit = findPermitById(permits, selectedPermitId);
  const result = calculateFeeResult(input, {
    category: selectedPermit?.category,
    safetyCheck: selectedPermit?.safetyCheck,
  });
  const compatibleTypes = selectedPermit
    ? getSupportedFeeSignTypesForPermitKind(selectedPermit.kind)
    : feeSignTypeOptions.map((option) => option.value);
  const isCompatibleWithPermit = selectedPermit
    ? isFeeSignTypeCompatible(selectedPermit.kind, input.signType)
    : true;
  const filteredPermits = permits.filter((permit) => {
    if (!deferredPermitQuery.trim()) return true;
    const query = deferredPermitQuery.trim().toLowerCase();
    return (
      permit.id.toLowerCase().includes(query) ||
      permit.advertiser.toLowerCase().includes(query) ||
      permit.place.toLowerCase().includes(query)
    );
  });

  const actionPayload = {
    permitRecordNo: selectedPermit?.id ?? null,
    permitKindSnapshot: selectedPermit?.kind ?? null,
    categorySnapshot: selectedPermit?.category ?? null,
    safetyCheckSnapshot: selectedPermit?.safetyCheck ?? null,
    input,
  };

  function handleTypeChange(nextType: FeeSignType) {
    setInput(createDefaultFeeInput(nextType));
    setFeedback(null);
  }

  function handleSave() {
    setFeedback(null);
    startSaving(async () => {
      const response = await saveFeeCalculation(actionPayload);
      if (response.error) {
        setFeedback({ tone: "error", text: response.error });
        return;
      }
      setFeedback({ tone: "success", text: "계산 기록이 저장되었습니다." });
      router.refresh();
    });
  }

  function handleApply() {
    setFeedback(null);
    startApplying(async () => {
      const response = await applyFeeCalculationToPermit(actionPayload);
      if (response.error) {
        setFeedback({ tone: "error", text: response.error });
        return;
      }
      setFeedback({ tone: "success", text: "계산 결과를 허가 기록에 반영했습니다." });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Fee Calculator</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">수수료 계산기</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              엑셀 산정식 기준으로 허가수수료와 안전점검 수수료를 계산하고, 필요하면 허가 기록에 반영합니다.
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            현재 계산 유형: <span className="font-semibold text-slate-900">{getFeeSignTypeLabel(input.signType)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <article className="panel flex flex-col gap-5">
          <div>
            <p className="eyebrow">Permit Link</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">허가 기록 연결</h3>
            <p className="mt-2 text-sm text-slate-600">
              선택한 허가의 구분과 안전점검 상태에 따라 실제 반영 금액이 달라집니다.
            </p>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            허가 검색
            <input
              className="field"
              value={permitQuery}
              onChange={(event) => setPermitQuery(event.target.value)}
              placeholder="관리번호, 광고주, 주소 검색"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            허가 선택
            <select className="field" value={selectedPermitId} onChange={(event) => setSelectedPermitId(event.target.value)}>
              <option value="">허가 기록을 선택하지 않고 계산만 수행</option>
              {filteredPermits.map((permit) => (
                <option key={permit.id} value={permit.id}>
                  {permit.id} · {permit.advertiser}
                </option>
              ))}
            </select>
          </label>

          {selectedPermit ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-950">{selectedPermit.advertiser}</p>
              <p className="mt-1">{selectedPermit.kind} / {getCategoryDisplayLabel(selectedPermit.category)}</p>
              <p className="mt-1">안전점검 상태: {getSafetyCheckDisplayLabel(selectedPermit.safetyCheck)}</p>
              <p className="mt-1 text-slate-500">{selectedPermit.place}</p>
            </div>
          ) : null}

          {selectedPermit && !isCompatibleWithPermit ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              선택한 허가 종류와 현재 계산 유형이 맞지 않습니다. 가능한 계산 유형:{" "}
              {compatibleTypes.map((type) => getFeeSignTypeLabel(type)).join(", ")}
            </div>
          ) : null}
        </article>

        <article className="panel flex flex-col gap-6">
          <div>
            <p className="eyebrow">Formula Inputs</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">계산 유형과 입력값</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {feeSignTypeOptions.map((option) => {
              const active = input.signType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTypeChange(option.value)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-950">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{option.description}</p>
                </button>
              );
            })}
          </div>

          {renderFeeFields(input, setInput)}
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel">
          <p className="text-sm text-slate-500">허가수수료</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{formatWon(result.permitFee)}</p>
        </article>
        <article className="panel">
          <p className="text-sm text-slate-500">내용변경수수료</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{formatWon(result.changeFee)}</p>
        </article>
        <article className="panel">
          <p className="text-sm text-slate-500">안전점검 수수료</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{formatWon(result.safetyFee)}</p>
        </article>
        <article className="panel">
          <p className="text-sm text-slate-500">실제 반영 합계</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatWon(selectedPermit ? result.appliedTotalFee : result.totalFee)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {selectedPermit
              ? `허가 ${formatWon(result.appliedPermitFee)} + 안전점검 ${formatWon(result.appliedSafetyFee)}`
              : `허가 ${formatWon(result.permitFee)} + 안전점검 ${formatWon(result.safetyFee)}`}
          </p>
        </article>
      </section>

      {result.errors.length > 0 ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
          {result.errors.join(" ")}
        </div>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {result.warnings.join(" ")}
        </div>
      ) : null}

      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
              : "rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
          }
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Actions</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">저장과 반영</h3>
            <p className="mt-2 text-sm text-slate-600">
              계산 기록은 permit 선택 없이 저장할 수 있고, permit 반영은 호환성과 상태 검증을 통과해야 합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="button-secondary"
              disabled={isSaving || result.errors.length > 0}
              onClick={handleSave}
            >
              {isSaving ? "저장 중..." : "계산 기록 저장"}
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={isApplying || result.errors.length > 0 || !selectedPermit || !isCompatibleWithPermit || !result.canApplyToPermit}
              onClick={handleApply}
            >
              {isApplying ? "반영 중..." : "선택 허가에 반영"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
