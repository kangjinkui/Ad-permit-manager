"use client";

import { useMemo, useState } from "react";
import { permitKinds } from "@/lib/mock-data";
import type { PermitSignFace } from "@/lib/sign-faces";

const lightingOptions = ["비조명", "내부조명", "외부조명"] as const;

type EditableFace = {
  width: string;
  height: string;
  lighting: string;
  place: string;
  content: string;
};

type Props = {
  defaultKind?: string;
  defaultWidth?: number | null;
  defaultHeight?: number | null;
  defaultLighting?: string | null;
  defaultPlace?: string | null;
  defaultContent?: string | null;
  defaultSignFaces?: PermitSignFace[] | null;
};

function emptyFace(): EditableFace {
  return { width: "", height: "", lighting: "", place: "", content: "" };
}

function toEditableFace(face: PermitSignFace): EditableFace {
  return {
    width: face.width != null ? String(face.width) : "",
    height: face.height != null ? String(face.height) : "",
    lighting: face.lighting ?? "",
    place: face.place ?? "",
    content: face.content ?? "",
  };
}

function buildInitialFaces(props: Props): EditableFace[] {
  if (props.defaultSignFaces?.length) {
    return props.defaultSignFaces.map(toEditableFace);
  }

  return [
    toEditableFace({
      width: props.defaultWidth ?? null,
      height: props.defaultHeight ?? null,
      lighting: (props.defaultLighting ?? null) as PermitSignFace["lighting"],
      place: props.defaultPlace ?? null,
      content: props.defaultContent ?? null,
    }),
  ];
}

function toPayload(faces: EditableFace[]) {
  return faces
    .map((face) => ({
      width: face.width.trim() === "" ? null : Number(face.width),
      height: face.height.trim() === "" ? null : Number(face.height),
      lighting: face.lighting || null,
      place: face.place.trim() || null,
      content: face.content.trim() || null,
    }))
    .filter(
      (face) =>
        face.width !== null ||
        face.height !== null ||
        face.lighting !== null ||
        face.place !== null ||
        face.content !== null,
    );
}

export function SignSpecificationFields({
  defaultKind = permitKinds[0],
  defaultWidth = null,
  defaultHeight = null,
  defaultLighting = null,
  defaultPlace = null,
  defaultContent = null,
  defaultSignFaces = null,
}: Props) {
  const [kind, setKind] = useState(defaultKind);
  const [faces, setFaces] = useState<EditableFace[]>(() =>
    buildInitialFaces({
      defaultKind,
      defaultWidth,
      defaultHeight,
      defaultLighting,
      defaultPlace,
      defaultContent,
      defaultSignFaces,
    }),
  );

  const signFacesJson = useMemo(() => JSON.stringify(toPayload(faces)), [faces]);

  function updateFace(index: number, patch: Partial<EditableFace>) {
    setFaces((current) =>
      current.map((face, faceIndex) =>
        faceIndex === index ? { ...face, ...patch } : face,
      ),
    );
  }

  function addFace() {
    setFaces((current) => [...current, emptyFace()]);
  }

  function removeFace(index: number) {
    setFaces((current) => {
      const next = current.filter((_, faceIndex) => faceIndex !== index);
      return next.length > 0 ? next : [emptyFace()];
    });
  }

  return (
    <>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        종류 *
        <select
          name="kind"
          className="field"
          required
          value={kind}
          onChange={(event) => setKind(event.target.value)}
        >
          {permitKinds.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 xl:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">광고물 규격 및 조명</p>
            <p className="mt-1 text-xs text-slate-400">
              한 건에 여러 면을 신청하는 경우 면을 추가하세요. 목록·검색에는 1면 정보가
              대표값으로 표시되고, 소심의 의결서에는 모든 면이 반영됩니다.
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={addFace}>
            면 추가
          </button>
        </div>

        <input type="hidden" name="sign_faces_json" value={signFacesJson} />

        <div className="mt-3 flex flex-col gap-4">
          {faces.map((face, index) => {
            const isPrimary = index === 0;

            return (
              <div
                key={`sign-face-${index}`}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {index + 1}면
                    {isPrimary && faces.length > 1 ? (
                      <span className="ml-2 text-xs font-normal text-slate-400">대표</span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={faces.length <= 1}
                    onClick={() => removeFace(index)}
                  >
                    삭제
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    가로 (M)
                    <input
                      name={isPrimary ? "width" : undefined}
                      type="number"
                      min="0"
                      step="0.001"
                      className="field"
                      value={face.width}
                      placeholder="예: 0.965"
                      onChange={(event) =>
                        updateFace(index, { width: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    세로 (M)
                    <input
                      name={isPrimary ? "height" : undefined}
                      type="number"
                      min="0"
                      step="0.001"
                      className="field"
                      value={face.height}
                      placeholder="예: 1.835"
                      onChange={(event) =>
                        updateFace(index, { height: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    조명
                    <select
                      name={isPrimary ? "lighting" : undefined}
                      className="field"
                      value={face.lighting}
                      onChange={(event) =>
                        updateFace(index, { lighting: event.target.value })
                      }
                    >
                      <option value="">선택 안 함</option>
                      {lightingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-3">
                    표시장소 {isPrimary ? "*" : null}
                    <input
                      name={isPrimary ? "place" : undefined}
                      className="field"
                      required={isPrimary}
                      value={face.place}
                      placeholder="주소 또는 위치 설명"
                      onChange={(event) =>
                        updateFace(index, { place: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 md:col-span-3">
                    표시내용 {isPrimary ? "*" : null}
                    <input
                      name={isPrimary ? "content" : undefined}
                      className="field"
                      required={isPrimary}
                      value={face.content}
                      placeholder="표시 내용 입력"
                      onChange={(event) =>
                        updateFace(index, { content: event.target.value })
                      }
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
