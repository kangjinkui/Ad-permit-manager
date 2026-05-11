"use client";

import { useMemo, useState } from "react";
import { permitKinds, type SignFace } from "@/lib/mock-data";

const ROOFTOP_KIND = "옥상간판";
const lightingOptions = ["비조명", "내부조명", "외부조명"] as const;

type EditableFace = {
  width: string;
  height: string;
  lighting: string;
};

type Props = {
  defaultKind?: string;
  defaultWidth?: number | null;
  defaultHeight?: number | null;
  defaultLighting?: string | null;
  defaultSignFaces?: SignFace[] | null;
};

function toEditableFace(face?: SignFace | null): EditableFace {
  return {
    width: face?.width != null ? String(face.width) : "",
    height: face?.height != null ? String(face.height) : "",
    lighting: face?.lighting ?? "",
  };
}

function buildInitialFaces(props: Props): EditableFace[] {
  if (props.defaultSignFaces?.length) {
    return props.defaultSignFaces.map(toEditableFace);
  }

  const firstFace = toEditableFace({
    width: props.defaultWidth ?? null,
    height: props.defaultHeight ?? null,
    lighting: (props.defaultLighting ?? null) as SignFace["lighting"],
  });

  if (props.defaultKind === ROOFTOP_KIND) {
    return [firstFace, toEditableFace(), toEditableFace()];
  }

  return [firstFace];
}

function toPayload(faces: EditableFace[]) {
  return faces
    .map((face) => ({
      width: face.width.trim() === "" ? null : Number(face.width),
      height: face.height.trim() === "" ? null : Number(face.height),
      lighting: face.lighting || null,
    }))
    .filter(
      (face) =>
        face.width !== null || face.height !== null || face.lighting !== null,
    );
}

export function SignSpecificationFields({
  defaultKind = permitKinds[0],
  defaultWidth = null,
  defaultHeight = null,
  defaultLighting = null,
  defaultSignFaces = null,
}: Props) {
  const [kind, setKind] = useState(defaultKind);
  const [faces, setFaces] = useState<EditableFace[]>(() =>
    buildInitialFaces({ defaultKind, defaultWidth, defaultHeight, defaultLighting, defaultSignFaces }),
  );

  const isRooftop = kind === ROOFTOP_KIND;
  const signFacesJson = useMemo(
    () => (isRooftop ? JSON.stringify(toPayload(faces)) : ""),
    [faces, isRooftop],
  );

  function updateFace(index: number, patch: Partial<EditableFace>) {
    setFaces((current) =>
      current.map((face, faceIndex) =>
        faceIndex === index ? { ...face, ...patch } : face,
      ),
    );
  }

  function handleKindChange(nextKind: string) {
    setKind(nextKind);

    if (nextKind === ROOFTOP_KIND && kind !== ROOFTOP_KIND) {
      setFaces((current) => {
        if (current.length >= 3) return current;
        return [
          ...current,
          ...Array.from({ length: 3 - current.length }, () => toEditableFace()),
        ];
      });
    }
  }

  function addFace() {
    setFaces((current) => [...current, toEditableFace()]);
  }

  function removeFace(index: number) {
    setFaces((current) => {
      const next = current.filter((_, faceIndex) => faceIndex !== index);
      return next.length > 0 ? next : [toEditableFace()];
    });
  }

  const firstFace = faces[0] ?? toEditableFace();

  return (
    <>
      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        종류 *
        <select
          name="kind"
          className="field"
          required
          value={kind}
          onChange={(event) => handleKindChange(event.target.value)}
        >
          {permitKinds.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2 xl:col-span-3">
        <p className="text-sm font-semibold text-slate-700">
          광고물 규격 및 조명
        </p>
        <p className="mt-1 text-xs text-slate-400">
          소심의 의결서 생성에 사용됩니다.
        </p>

        {isRooftop ? (
          <div className="mt-3 flex flex-col gap-4">
            <input type="hidden" name="sign_faces_json" value={signFacesJson} />
            <div className="flex justify-end">
              <button type="button" className="button-secondary" onClick={addFace}>
                면 추가
              </button>
            </div>
            {faces.map((face, index) => (
              <div
                key={`sign-face-${index}`}
                className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
              >
                <p className="flex items-center text-sm font-semibold text-slate-900">
                  {index + 1}면
                </p>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  가로 (M)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field"
                    value={face.width}
                    placeholder="예: 8"
                    onChange={(event) =>
                      updateFace(index, { width: event.target.value })
                    }
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  세로 (M)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="field"
                    value={face.height}
                    placeholder="예: 2.4"
                    onChange={(event) =>
                      updateFace(index, { height: event.target.value })
                    }
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                    조명
                    <select
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
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={faces.length <= 1}
                      onClick={() => removeFace(index)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input type="hidden" name="sign_faces_json" value="" />
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              가로 (M)
              <input
                name="width"
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={firstFace.width}
                placeholder="예: 0.96"
                onChange={(event) =>
                  updateFace(0, { width: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              세로 (M)
              <input
                name="height"
                type="number"
                min="0"
                step="0.01"
                className="field"
                value={firstFace.height}
                placeholder="예: 1.83"
                onChange={(event) =>
                  updateFace(0, { height: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              조명
              <select
                name="lighting"
                className="field"
                value={firstFace.lighting}
                onChange={(event) =>
                  updateFace(0, { lighting: event.target.value })
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
          </div>
        )}
      </div>
    </>
  );
}
