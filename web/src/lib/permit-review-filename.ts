const encoder = new TextEncoder();
const windowsDeviceName = /^(?:con|prn|aux|nul|(?:com|lpt)[0-9¹²³]) *(?:\.|$)/i;

function safePathPart(value: string, fallback: string, maxBytes: number): string {
  const cleaned = value.trim().replace(/[<>:"/\\|?*\x00-\x1f\x7f\ud800-\udfff]/gu, "_");
  let name = "";
  let bytes = 0;
  for (const character of cleaned) {
    bytes += encoder.encode(character).length;
    if (bytes > maxBytes - 1) break;
    name += character;
  }
  name = name.replace(/[. ]+$/, "") || fallback;
  return windowsDeviceName.test(name) ? `_${name}` : name;
}

export function getPermitReviewFileNames(kind: string, advertiser: string) {
  const prefix = `옥외광고물_검토서_${safePathPart(kind, "간판", 64)}_`;
  const extension = ".hwpx";
  const directoryName = safePathPart(
    advertiser,
    "광고주 미기재",
    255 - encoder.encode(prefix + extension).length,
  );
  return { directoryName, fileName: prefix + directoryName + extension };
}
