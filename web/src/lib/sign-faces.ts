import type { SignFace } from "@/lib/mock-data";

/**
 * 한 허가 건에 여러 면을 신청하는 경우의 면별 정보.
 * mock-data.ts 의 SignFace(규격·조명)에 면별 표시장소·표시내용을 더한다.
 */
export type PermitSignFace = SignFace & {
  place: string | null;
  content: string | null;
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseLighting(value: unknown): SignFace["lighting"] {
  return value === "비조명" || value === "내부조명" || value === "외부조명"
    ? value
    : null;
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isEmptyFace(face: PermitSignFace): boolean {
  return (
    face.width === null &&
    face.height === null &&
    face.lighting === null &&
    face.place === null &&
    face.content === null
  );
}

export function parseSignFacesJson(
  value: FormDataEntryValue | null,
): PermitSignFace[] | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;

    const faces = parsed
      .map((face) => {
        if (!face || typeof face !== "object") return null;
        const data = face as Record<string, unknown>;
        const normalized: PermitSignFace = {
          width: parseNumber(data.width),
          height: parseNumber(data.height),
          lighting: parseLighting(data.lighting),
          place: parseText(data.place),
          content: parseText(data.content),
        };

        return isEmptyFace(normalized) ? null : normalized;
      })
      .filter((face): face is PermitSignFace => Boolean(face));

    return faces.length > 0 ? faces : null;
  } catch {
    return null;
  }
}

export function getPrimarySignFace(
  signFaces: PermitSignFace[] | null,
): PermitSignFace | null {
  return signFaces?.[0] ?? null;
}

/**
 * 면별 값 중 실제로 채워진 것들만 모은다.
 * 값이 하나뿐이거나 전부 같으면 단일 문자열, 여러 개면 "1면: … / 2면: …" 형태로 결합한다.
 */
export function joinFaceValues(
  faces: PermitSignFace[] | null,
  pick: (face: PermitSignFace) => string | null,
): string | null {
  if (!faces?.length) return null;

  const labelled = faces
    .map((face, index) => ({ index, value: pick(face) }))
    .filter((entry): entry is { index: number; value: string } =>
      Boolean(entry.value),
    );

  if (labelled.length === 0) return null;

  const unique = new Set(labelled.map((entry) => entry.value));
  if (unique.size === 1) return labelled[0].value;

  return labelled
    .map((entry) => `${entry.index + 1}면: ${entry.value}`)
    .join(" / ");
}

/**
 * 폼 데이터에서 면 목록과, 목록·검색에서 쓰는 최상위 대표값을 함께 뽑아낸다.
 * 대표값은 1면 기준이며, 면 정보가 비어 있으면 개별 입력 필드로 폴백한다.
 */
export function getPermitSpecificationPayload(formData: FormData) {
  const signFaces = parseSignFacesJson(formData.get("sign_faces_json"));
  const primaryFace = getPrimarySignFace(signFaces);

  const widthField = parseNumber(formData.get("width")?.toString());
  const heightField = parseNumber(formData.get("height")?.toString());
  const lightingField = parseLighting(formData.get("lighting")?.toString());
  const placeField = parseText(formData.get("place")?.toString());
  const contentField = parseText(formData.get("content")?.toString());

  return {
    width: primaryFace?.width ?? widthField,
    height: primaryFace?.height ?? heightField,
    lighting: primaryFace?.lighting ?? lightingField,
    place: primaryFace?.place ?? placeField,
    content: primaryFace?.content ?? contentField,
    sign_faces: signFaces,
  };
}
