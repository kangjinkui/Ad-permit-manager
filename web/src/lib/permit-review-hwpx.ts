import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import manifest from "../../templates/review/manifest.json";
import { getReviewChecks, getSuggestedCheckValue, type ReviewDraft, type ReviewTemplateId, type ReviewValues } from "./permit-review";

const templateDirectory = path.join(process.cwd(), "templates", "review");
const tokenPattern = /\{\{REVIEW:([A-Za-z][A-Za-z0-9]*)\}\}/g;
const escapeCharacters: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

function xmlText(value: string): string {
  return value.replace(/[&<>]/g, (character) => escapeCharacters[character])
    .replace(/\r\n?|\n/g, "<hp:lineBreak/>")
    .replace(/\t/g, "    ");
}

function documentSignType(templateId: ReviewTemplateId, { wallPlacement, orientation }: ReviewValues): string {
  switch (templateId) {
    case "T01": return "옥상간판";
    case "T02":
    case "T03":
    case "T05": return `벽면이용간판 (${orientation}상단)`;
    case "T04":
    case "T09": return "돌출간판";
    case "T06": return "입간판";
    case "T07": return "벽면이용간판";
    case "T08": {
      const kind = wallPlacement === "상단" ? "벽면이용 상단간판" : "벽면이용간판";
      return orientation ? `${kind} (${orientation})` : kind;
    }
  }
}

function splitLines(value: string): [string, string] {
  const [first = "", ...other] = value.split(/\r?\n/);
  return [first, other.join("\n")];
}

function period(start: string | undefined, end: string | undefined): string {
  return start && end ? `${start} ~ ${end}` : "";
}

function buildReplacements(templateId: ReviewTemplateId, draft: ReviewDraft, attachments: readonly string[]) {
  const { fields, checks } = draft;
  const specification = fields.specification ?? "";
  const [firstSpecification, otherSpecifications] = splitLines(specification);
  const periodBefore = period(fields.periodBeforeFrom, fields.periodBeforeTo);
  const safetyInspection = [fields.safetyResult, fields.safetyDate].filter(Boolean).join(" · ");
  const replacements: Record<string, string> = {
    signType: documentSignType(templateId, fields),
    wallRenewalTitle: fields.wallPlacement === "상단"
      ? "검   토   서(벽면이용 상단간판 표시기간 연장)"
      : "검   토   서(벽면이용간판)",
    applicant: fields.applicant ?? "",
    installationAddress: fields.installationAddress ?? "",
    displayText: fields.displayText ?? "",
    specification: templateId === "T07" ? firstSpecification : specification,
    specification2: otherSpecifications,
    quantity: fields.quantity ? `${fields.quantity}개` : "",
    lighting: fields.lighting ?? "",
    permitNumberLabel: fields.permitNumberLabel ?? "",
    permitOrReportNo: fields.permitOrReportNo ?? "",
    previousDisplayText: fields.previousDisplayText ?? "",
    currentPeriod: periodBefore,
    applicantDisplayText: [fields.applicant, fields.displayText].filter(Boolean).join(" / "),
    periodBefore: periodBefore.replaceAll("-", "."),
    periodAfter: period(fields.periodAfterFrom, fields.periodAfterTo).replaceAll("-", "."),
    reviewOpinion: fields.reviewOpinion ?? "",
    reviewer: fields.reviewer ? `작성자 ${fields.reviewer}` : "작성자",
    attachments: attachments.length ? attachments.map((name, index) => `${index + 1}. ${name}`).join("\n") : "없음",
    safetyStandard: `○ 안전점검 ${safetyInspection || "확인필요"}`,
  };

  for (const { key, standardText } of getReviewChecks(templateId, fields)) {
    const check = checks[key];
    const appliedValue = check?.appliedValue || getSuggestedCheckValue(templateId, key, fields);
    if (templateId === "T08" && key === "row6") replacements.wallRenewalSizeStandard = standardText;
    if (templateId === "T07" && key === "row6") {
      const [firstValue, otherValues] = check?.appliedValue
        ? splitLines(check.appliedValue)
        : [firstSpecification, otherSpecifications];
      replacements[`${key}Value`] = firstValue;
      replacements[`${key}Value2`] = otherValues;
    } else {
      replacements[`${key}Value`] = appliedValue;
    }
    replacements[`${key}Status`] = check?.status ?? "확인필요";
  }
  return replacements;
}

export async function generatePermitReviewHwpx(
  templateId: ReviewTemplateId,
  draft: ReviewDraft,
  attachments: readonly string[],
): Promise<Uint8Array<ArrayBuffer>> {
  const asset = manifest.templates[templateId];
  const template = await readFile(path.join(templateDirectory, asset.file));
  if (createHash("sha256").update(template).digest("hex") !== asset.sha256) {
    throw new Error(`Unexpected HWPX template checksum (${templateId})`);
  }

  const zip = await JSZip.loadAsync(template);
  const section = zip.file("Contents/section0.xml");
  const mimetype = zip.file("mimetype");
  if (!section || !mimetype) throw new Error(`Incomplete HWPX template (${templateId})`);

  const [xml, mime] = await Promise.all([section.async("string"), mimetype.async("uint8array")]);
  const replacements = buildReplacements(templateId, draft, attachments);
  // The preparation script parses the source XML and inserts tokens at checked cell coordinates.
  const sectionXml = xml.replace(tokenPattern, (_, key: string) => {
    if (!Object.hasOwn(replacements, key)) throw new Error(`Unexpected HWPX field (${templateId}/${key})`);
    return xmlText(replacements[key]);
  });

  zip.file("mimetype", mime, { compression: "STORE", createFolders: false });
  zip.file("Contents/section0.xml", sectionXml, { createFolders: false });
  return Uint8Array.from(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}
