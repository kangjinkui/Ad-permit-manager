import type { SignFace } from "@/lib/mock-data";

const ROOFTOP_KIND = "옥상간판";

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

export function parseSignFacesJson(value: FormDataEntryValue | null): SignFace[] | null {
  if (typeof value !== "string" || value.trim() === "") return null;

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;

    const faces = parsed
      .map((face) => {
        if (!face || typeof face !== "object") return null;
        const data = face as Record<string, unknown>;
        const normalized = {
          width: parseNumber(data.width),
          height: parseNumber(data.height),
          lighting: parseLighting(data.lighting),
        };

        if (
          normalized.width === null &&
          normalized.height === null &&
          normalized.lighting === null
        ) {
          return null;
        }

        return normalized;
      })
      .filter((face): face is SignFace => Boolean(face));

    return faces.length > 0 ? faces : null;
  } catch {
    return null;
  }
}

export function getPrimarySignFace(signFaces: SignFace[] | null): SignFace | null {
  return signFaces?.[0] ?? null;
}

export function getPermitSpecificationPayload(formData: FormData) {
  const kind = formData.get("kind")?.toString() ?? "";

  if (kind === ROOFTOP_KIND) {
    const signFaces = parseSignFacesJson(formData.get("sign_faces_json"));
    const primaryFace = getPrimarySignFace(signFaces);
    return {
      width: primaryFace?.width ?? null,
      height: primaryFace?.height ?? null,
      lighting: primaryFace?.lighting ?? null,
      sign_faces: signFaces,
    };
  }

  const widthRaw = formData.get("width")?.toString();
  const heightRaw = formData.get("height")?.toString();
  return {
    width: parseNumber(widthRaw),
    height: parseNumber(heightRaw),
    lighting: formData.get("lighting")?.toString() || null,
    sign_faces: null,
  };
}
