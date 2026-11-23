import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import JSZip from "jszip";

const webDirectory = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(await fs.readFile(new URL("../templates/review/manifest.json", import.meta.url), "utf8"));
const sectionFile = "Contents/section0.xml";
const fixtures = {
  T01: ["옥상간판", "내용변경", {}],
  T02: ["벽면이용간판", "신규", { wallPlacement: "상단", buildingFloors: "11", orientation: "세로형" }],
  T03: ["벽면이용간판", "신규", { wallPlacement: "상단", buildingFloors: "11", orientation: "가로형" }],
  T04: ["돌출간판", "신규", {}],
  T05: ["벽면이용간판", "신규", { wallPlacement: "상단", buildingFloors: "10", orientation: "세로형" }],
  T06: ["입간판", "신규", {}],
  T07: ["벽면이용간판", "신규", { wallPlacement: "일반" }],
  T08: ["벽면이용간판", "연장", {}],
  T09: ["돌출간판", "연장", {}],
};

const draftFields = {
  applicant: "검증 업체",
  installationAddress: "검증시 테스트길",
  displayText: "새 표시 & <한글>",
  previousDisplayText: "이전 표시",
  quantity: "2",
  specification: "1.2 × 3.4\n5.6 × 7.8\n9.1 × 2.3",
  lighting: "비조명",
  permitNumberLabel: "허가번호",
  permitOrReportNo: "검증-0001",
  periodBeforeFrom: "2030-01-01",
  periodBeforeTo: "2031-12-31",
  periodAfterFrom: "2032-01-01",
  periodAfterTo: "2033-12-31",
  safetyResult: "불합격",
  safetyDate: "2032-01-31",
  reviewer: "검증 작성자",
  reviewOpinion: "첫 문장 & <검토>\n둘째 문장",
};

function structuralTags(xml) {
  return xml.match(/<\/?hp:(?:tbl|tr|tc|cellAddr|cellSpan|cellSz|p|run|secPr)\b[^>]*>/g);
}

function tableCell(xml, tableIndex, row, column) {
  const table = (xml.match(/<hp:tbl\b[\s\S]*?<\/hp:tbl>/g) ?? [])[tableIndex];
  const cell = (table?.match(/<hp:tc\b[\s\S]*?<\/hp:tc>/g) ?? []).find((value) => {
    const address = value.match(/<hp:cellAddr\b[^>]*>/)?.[0];
    return address?.includes(`rowAddr="${row}"`) && address.includes(`colAddr="${column}"`);
  });
  assert.ok(cell, `Missing cell ${tableIndex}/${row}/${column}`);
  return cell;
}

async function verify() {
  const cacheDirectory = path.join(webDirectory, "node_modules", ".cache");
  await fs.mkdir(cacheDirectory, { recursive: true });
  const temporary = await fs.mkdtemp(path.join(cacheDirectory, "permit-review-"));
  try {
    execFileSync(process.execPath, [createRequire(import.meta.url).resolve("typescript/bin/tsc"),
      "--noCheck", "--module", "commonjs", "--target", "es2022", "--resolveJsonModule", "--esModuleInterop",
      "--rootDir", ".", "--outDir", temporary, "src/lib/permit-review-hwpx.ts",
    ], { cwd: webDirectory, stdio: "inherit" });
    const { calculateRenewalPeriods, getReviewDownloadError, getReviewFieldKeys, getSuggestedCheckValue, getUpperWallSizeBand, normalizeReviewDraft, selectReviewTemplate } =
      (await import(pathToFileURL(path.join(temporary, "src/lib/permit-review.js")))).default;
    const { generatePermitReviewHwpx } =
      (await import(pathToFileURL(path.join(temporary, "src/lib/permit-review-hwpx.js")))).default;

    assert.deepEqual(Object.keys(fixtures), Object.keys(manifest.templates));
    assert.equal(selectReviewTemplate("벽면이용간판", "신규", { wallPlacement: "상단" }).templateId, null);
    assert.equal(selectReviewTemplate("벽면이용간판", "신규", { wallPlacement: "상단", buildingFloors: "11" }).templateId, null);
    assert.equal(selectReviewTemplate("벽면이용간판", "관리자변경", {}).templateId, null);
    assert.ok(normalizeReviewDraft({ fields: { safetyDate: "2031-02-29" }, checks: {} }, "돌출간판", "연장").error);
    assert.ok(normalizeReviewDraft({ fields: { periodBeforeFrom: "2031-01-01", periodBeforeTo: "2030-01-01" }, checks: {} }, "돌출간판", "연장").error);
    assert.ok(normalizeReviewDraft({ fields: {}, checks: { row999: { status: "적합" } } }, "입간판", "신규").error);
    assert.deepEqual(calculateRenewalPeriods("2023-11-17"), {
      periodBeforeTo: "2026-11-16", periodAfterFrom: "2026-11-17", periodAfterTo: "2029-11-16",
    });
    assert.deepEqual(calculateRenewalPeriods("2024-02-29"), {
      periodBeforeTo: "2027-02-28", periodAfterFrom: "2027-03-01", periodAfterTo: "2030-02-28",
    });
    assert.deepEqual(calculateRenewalPeriods("2023-02-29"), {
      periodBeforeTo: "", periodAfterFrom: "", periodAfterTo: "",
    });
    assert.equal(getSuggestedCheckValue("T08", "row3", { floor: "7" }), "7층");
    assert.equal(getSuggestedCheckValue("T08", "row3", { floor: "지상 7층" }), "지상 7층");
    assert.equal(getSuggestedCheckValue("T08", "row3", { floor: "옥상", wallPlacement: "상단" }), "옥상");
    assert.ok(!Object.keys(fixtures).some((templateId) => getReviewFieldKeys(templateId).includes("businessWidthM")));
    assert.equal(getUpperWallSizeBand("10"), "10층 이하");
    assert.equal(getUpperWallSizeBand("11"), "11층 이상");
    assert.equal(getUpperWallSizeBand("10.5"), null);
    assert.equal(getUpperWallSizeBand(undefined), null);

    for (const [caseIndex, [templateId, [kind, category, selectorFields]]] of Object.entries(fixtures).entries()) {
      const checks = {
        row1: { appliedValue: "테스트 신청", status: "적합", evidence: "검증 근거" },
        row2: { appliedValue: "", status: "부적합" },
        row3: { appliedValue: "", status: "해당없음" },
      };
      const normalized = normalizeReviewDraft({ fields: { ...draftFields, ...selectorFields, businessWidthM: "99" }, checks }, kind, category);
      assert.equal(normalized.error, undefined);
      assert.equal(normalized.templateId, templateId);
      assert.equal(getReviewDownloadError(templateId, normalized.draft.fields), null);
      assert.equal(normalized.draft.fields.businessWidthM, undefined);
      assert.deepEqual(normalized.draft.checks.row1, { appliedValue: "테스트 신청", status: "적합" });

      const asset = manifest.templates[templateId];
      const rawTemplate = await fs.readFile(path.join(webDirectory, "templates", "review", asset.file));
      const generated = Buffer.from(await generatePermitReviewHwpx(templateId, normalized.draft, ["검증&사진.png"]));
      assert.equal(generated.toString("ascii", 30, 38), "mimetype");
      assert.equal(generated.readUInt16LE(8), 0);
      const [original, output] = await Promise.all([JSZip.loadAsync(rawTemplate), JSZip.loadAsync(generated)]);
      assert.deepEqual(Object.keys(output.files), Object.keys(original.files));
      assert.ok(!Object.keys(output.files).some((filename) => filename.startsWith("Preview/")));
      for (const filename of Object.keys(original.files).filter((name) => name !== sectionFile)) {
        assert.deepEqual(await output.file(filename).async("nodebuffer"), await original.file(filename).async("nodebuffer"));
      }
      const xml = await output.file(sectionFile).async("string");
      const originalXml = await original.file(sectionFile).async("string");
      assert.deepEqual(structuralTags(xml), structuralTags(originalXml));
      assert.equal((xml.match(/<hp:tbl\b/g) ?? []).length, 2);
      assert.deepEqual([...xml.matchAll(/<hp:tbl\b[^>]*\bid="(\d+)"/g)].map((match) => Number(match[1])),
        [1252152058 + 4 * caseIndex, 1252152059 + 4 * caseIndex]);
      assert.equal((xml.match(/<hp:secPr\b/g) ?? []).length, 1);
      assert.doesNotMatch(xml, /\{\{REVIEW:/);
      for (const value of [">적합<", ">부적합<", ">확인필요<", ">해당없음<", "작성자 검증 작성자", "검증&amp;사진.png", "새 표시 &amp; &lt;한글&gt;", "첫 문장 &amp; &lt;검토&gt;<hp:lineBreak/>둘째 문장"]) {
        assert.ok(xml.includes(value), `${templateId} missing ${value}`);
      }
      assert.doesNotMatch(xml, /검증 근거|업소 가로폭 99m/);
      if (templateId === "T01") assert.match(xml, /이전 표시/);
      if (templateId === "T07") {
        assert.match(xml, /5\.6 × 7\.8<hp:lineBreak\/>9\.1 × 2\.3/);
        for (const faceCount of [1, 2]) {
          const fields = { ...normalized.draft.fields, specification: draftFields.specification.split("\n").slice(0, faceCount).join("\n") };
          const file = await generatePermitReviewHwpx(templateId, { ...normalized.draft, fields }, []);
          const faceXml = await (await JSZip.loadAsync(file)).file(sectionFile).async("string");
          assert.doesNotMatch(faceXml, /9\.1 × 2\.3/);
          assert.equal(faceXml.includes("5.6 × 7.8"), faceCount === 2);
        }
      }
      if (templateId === "T09") {
        assert.match(xml, /2030\.01\.01 ~ 2031\.12\.31/);
        assert.match(xml, /2032\.01\.01 ~ 2033\.12\.31/);
        assert.match(xml, /2032-01-31/);
      }

      if (templateId === "T08") {
        assert.match(xml, /가로 업소폭 80%/);
        assert.match(tableCell(xml, 1, 10, 0), />안전점검</);
        assert.match(tableCell(xml, 1, 10, 1), /안전점검 결과와 검사일을 확인/);
        assert.match(tableCell(xml, 1, 10, 1), /charPrIDRef="94"><hp:t>○ 안전점검/);
        assert.doesNotMatch(tableCell(xml, 1, 10, 1), /2032[.-]01[.-]31/);
        assert.match(tableCell(xml, 1, 10, 2), /불합격<hp:lineBreak\/>2032\.01\.31/);
        assert.match(tableCell(xml, 1, 10, 3), />확인필요</);
        assert.match(tableCell(xml, 1, 1, 0), /「국토의 계획 및<hp:lineBreak\/>이용에 관한 법률」에<hp:lineBreak\/>따른 지역/);
        assert.match(tableCell(xml, 0, 0, 3), />상호명 \/ 표시내용</);
        assert.match(tableCell(xml, 0, 0, 6), /<hp:cellSpan\b[^>]*colSpan="2"/);
        assert.match(tableCell(xml, 0, 2, 3), /검증 업체\/<\/hp:t>.*<\/hp:p><hp:p\b.*새 표시/);
        assert.match(tableCell(xml, 0, 2, 6), /<hp:cellSz\b[^>]*height="4800"/);
        assert.match(tableCell(xml, 1, 10, 2), /<hp:cellSz\b[^>]*height="3300"/);
        const { periodBeforeTo, periodAfterFrom, periodAfterTo, ...baseFields } = normalized.draft.fields;
        assert.ok(periodBeforeTo && periodAfterFrom && periodAfterTo);
        assert.match(getReviewDownloadError("T08", { ...normalized.draft.fields, wallPlacement: "상단" }), /건물 전체 층수, 표시 방향/);
        const topRules = [
          ["4", "가로형", /10층 이하.*세로 최대 0\.6m/],
          ["10", "가로형", /10층 이하.*건물 가로폭의 1\/2 이내 \/ 세로 최대 1\.2m/],
          ["10", "세로형", /10층 이하.*가로 최대 1\.2m \/ 세로 건물 높이의 1\/2 이내, 최대 10m/],
          ["11", "가로형", /11층 이상.*건물 가로폭의 1\/2 이내 \/ 세로 최대 3m/],
          ["11", "세로형", /11층 이상.*가로 최대 2m \/ 세로 건물 높이의 1\/2 이내, 최대 10m/],
        ];
        for (const [buildingFloors, orientation, expected] of topRules) {
          const top = normalizeReviewDraft({
            fields: {
              ...baseFields, wallPlacement: "상단", floor: "옥상", periodBeforeFrom: "2023-11-17",
              permitNumberLabel: "신고번호", permitOrReportNo: "2031-1234567-09-2-00130", buildingFloors, orientation,
            },
            checks: {},
          }, kind, category);
          assert.equal(top.templateId, templateId);
          assert.equal(getReviewDownloadError(top.templateId, top.draft.fields), null);
          const topPackage = await JSZip.loadAsync(await generatePermitReviewHwpx(top.templateId, top.draft, []));
          const topXml = await topPackage.file(sectionFile).async("string");
          assert.match(topXml, /벽면이용 상단간판 표시기간 연장/);
          const sizeStandard = tableCell(topXml, 1, 6, 1);
          assert.match(sizeStandard, expected);
          assert.doesNotMatch(sizeStandard, /가로 업소폭 80%/);
          assert.match(tableCell(topXml, 1, 3, 2), />옥상</);
          assert.match(tableCell(topXml, 0, 0, 1), />신고번호</);
          assert.match(tableCell(topXml, 0, 2, 1), /2031-1234567-09-2-<hp:lineBreak\/>00130/);
          assert.match(tableCell(topXml, 0, 2, 6), /2023\.11\.17\. ~<hp:lineBreak\/>2026\.11\.16\./);
          assert.match(tableCell(topXml, 0, 2, 7), /2026\.11\.17\.<hp:lineBreak\/>~<hp:lineBreak\/>2029\.11\.16\./);
          for (const column of [0, 1, 6, 7]) {
            assert.equal((tableCell(topXml, 0, 2, column).match(/<hp:p\b/g) ?? []).length, 1);
          }
        }
      }
      console.log(`${templateId} structure and values OK`);
    }
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

process.chdir(webDirectory);
verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
