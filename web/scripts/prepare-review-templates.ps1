[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SpecificationPath,

  [Parameter(Mandatory = $false)]
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\templates\review")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedSourceSha256 = "0cee3548fe0928a480f874dfcf6720cc223c4c8b6567dd265e665093690661fc"
$ParagraphNamespace = "http://www.hancom.co.kr/hwpml/2011/paragraph"
$Utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)

$TemplateDefinitions = @(
  [ordered]@{ id = "T01"; start = 0; end = 22; topTable = 0; reviewTable = 1; type = "change" },
  [ordered]@{ id = "T02"; start = 23; end = 37; topTable = 2; reviewTable = 3; type = "standard" },
  [ordered]@{ id = "T03"; start = 38; end = 52; topTable = 4; reviewTable = 5; type = "standard" },
  [ordered]@{ id = "T04"; start = 53; end = 64; topTable = 6; reviewTable = 7; type = "standard" },
  [ordered]@{ id = "T05"; start = 65; end = 77; topTable = 8; reviewTable = 9; type = "standard" },
  [ordered]@{ id = "T06"; start = 78; end = 90; topTable = 10; reviewTable = 11; type = "standard" },
  [ordered]@{ id = "T07"; start = 91; end = 103; topTable = 12; reviewTable = 13; type = "multiFace" },
  [ordered]@{ id = "T08"; start = 104; end = 113; topTable = 14; reviewTable = 15; type = "renewal" },
  [ordered]@{ id = "T09"; start = 114; end = 126; topTable = 16; reviewTable = 17; type = "renewal" }
)

function Get-Sha256Hex {
  param([byte[]]$Bytes)

  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($hasher.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $hasher.Dispose()
  }
}

function New-NamespaceManager {
  param([System.Xml.XmlDocument]$Document)

  $manager = [System.Xml.XmlNamespaceManager]::new($Document.NameTable)
  $manager.AddNamespace("hp", $ParagraphNamespace)
  return ,$manager
}

function Get-NormalizedText {
  param([AllowEmptyString()][string]$Text)

  return ([regex]::Replace($Text, "\s+", " ")).Trim()
}

function Read-ZipEntryText {
  param(
    [System.IO.Compression.ZipArchive]$Archive,
    [string]$Name
  )

  $entry = $Archive.GetEntry($Name)
  if ($null -eq $entry) {
    throw "Required HWPX entry is missing: $Name"
  }

  $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8, $true)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Get-Cell {
  param(
    [System.Xml.XmlNode]$Table,
    [System.Xml.XmlNamespaceManager]$Namespaces,
    [int]$Row,
    [int]$Column
  )

  $cell = $Table.SelectSingleNode(
    "./hp:tr/hp:tc[hp:cellAddr/@rowAddr='$Row' and hp:cellAddr/@colAddr='$Column']",
    $Namespaces
  )
  if ($null -eq $cell) {
    throw "Cell ($Row,$Column) is missing from table id=$($Table.GetAttribute('id'))."
  }
  return $cell
}

function Set-NodeToken {
  param(
    [System.Xml.XmlNode]$Node,
    [System.Xml.XmlNamespaceManager]$Namespaces,
    [string]$Key,
    [switch]$CompactCell
  )

  $textNodes = @($Node.SelectNodes(".//hp:t", $Namespaces))
  if ($textNodes.Count -eq 0) {
    throw "Cannot place token '$Key' because the target contains no hp:t node."
  }

  $textNodes[0].InnerText = "{{REVIEW:$Key}}"
  for ($index = 1; $index -lt $textNodes.Count; $index++) {
    $textNodes[$index].InnerText = ""
  }

  # HWPX stores rendered line positions separately from the paragraph text.
  foreach ($textNode in $textNodes) {
    $paragraph = $textNode.SelectSingleNode("ancestor::hp:p[1]", $Namespaces)
    $lineLayout = $paragraph.SelectSingleNode("./hp:linesegarray", $Namespaces)
    if ($null -ne $lineLayout) {
      $paragraph.RemoveChild($lineLayout) | Out-Null
    }
  }

  if ($CompactCell) {
    foreach ($paragraph in @($Node.SelectNodes("./hp:subList/hp:p[position() > 1]", $Namespaces))) {
      $inlineControls = $paragraph.SelectNodes(".//hp:run/*[not(self::hp:t)] | .//hp:t/*", $Namespaces)
      if (-not $paragraph.InnerText.Trim() -and $inlineControls.Count -eq 0) {
        $paragraph.ParentNode.RemoveChild($paragraph) | Out-Null
      }
    }
  }
}

function Get-TopLevelParagraphText {
  param(
    [System.Xml.XmlNode]$Paragraph,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  $parts = @($Paragraph.SelectNodes(".//hp:t[not(ancestor::hp:tbl)]", $Namespaces) | ForEach-Object { $_.InnerText })
  return $parts -join ""
}

function Set-TableRowMinimumHeight {
  param([System.Xml.XmlNode]$Table, [System.Xml.XmlNamespaceManager]$Namespaces, [int]$Row, [int]$Height)

  $rowNode = $Table.SelectNodes("./hp:tr", $Namespaces).Item($Row)
  $sizes = @($rowNode.SelectNodes("./hp:tc/hp:cellSz", $Namespaces))
  $originalHeight = [int]$sizes[0].GetAttribute("height")
  if ($originalHeight -ge $Height) { return }
  foreach ($size in $sizes) {
    $size.SetAttribute("height", [string]$Height)
  }
  $tableSize = $Table.SelectSingleNode("./hp:sz", $Namespaces)
  $tableSize.SetAttribute("height", [string]([int]$tableSize.GetAttribute("height") + $Height - $originalHeight))
}

function Get-NextTextParagraph {
  param(
    [System.Xml.XmlNode[]]$Paragraphs,
    [int]$StartIndex,
    [System.Xml.XmlNamespaceManager]$Namespaces
  )

  for ($index = $StartIndex + 1; $index -lt $Paragraphs.Count; $index++) {
    if ($Paragraphs[$index].SelectNodes(".//hp:tbl", $Namespaces).Count -eq 0 -and
      $Paragraphs[$index].SelectNodes(".//hp:t", $Namespaces).Count -gt 0) {
      return $Paragraphs[$index]
    }
  }
  throw "No text paragraph follows paragraph index $StartIndex."
}

function Convert-XmlDocumentToBytes {
  param([System.Xml.XmlDocument]$Document)

  $stream = [System.IO.MemoryStream]::new()
  $settings = [System.Xml.XmlWriterSettings]::new()
  $settings.Encoding = $Utf8WithoutBom
  $settings.Indent = $false
  $settings.NewLineHandling = [System.Xml.NewLineHandling]::None
  $settings.OmitXmlDeclaration = $false
  $writer = [System.Xml.XmlWriter]::Create($stream, $settings)
  try {
    $Document.Save($writer)
    $writer.Flush()
    return ,$stream.ToArray()
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

function New-TemplatePackage {
  param(
    [System.IO.Compression.ZipArchive]$SourceArchive,
    [byte[]]$SectionBytes
  )

  $output = [System.IO.MemoryStream]::new()
  $archive = [System.IO.Compression.ZipArchive]::new($output, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($sourceEntry in $SourceArchive.Entries) {
      if ($sourceEntry.FullName.StartsWith("Preview/", [System.StringComparison]::OrdinalIgnoreCase)) {
        continue
      }

      $compression = if ($sourceEntry.FullName -eq "mimetype") {
        [System.IO.Compression.CompressionLevel]::NoCompression
      } else {
        [System.IO.Compression.CompressionLevel]::Optimal
      }
      $targetEntry = $archive.CreateEntry($sourceEntry.FullName, $compression)
      $targetEntry.LastWriteTime = $sourceEntry.LastWriteTime
      $targetStream = $targetEntry.Open()
      try {
        if ($sourceEntry.FullName -eq "Contents/section0.xml") {
          $targetStream.Write($SectionBytes, 0, $SectionBytes.Length)
        } else {
          $sourceStream = $sourceEntry.Open()
          try {
            $sourceStream.CopyTo($targetStream)
          } finally {
            $sourceStream.Dispose()
          }
        }
      } finally {
        $targetStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }

  try {
    return ,$output.ToArray()
  } finally {
    $output.Dispose()
  }
}

if (-not (Test-Path -LiteralPath $SpecificationPath -PathType Leaf)) {
  throw "Specification file not found: $SpecificationPath"
}

$specification = Get-Content -Raw -Encoding UTF8 -LiteralPath $SpecificationPath
$fence = [string]([char]96) * 3
$base64Pattern = "(?s)<!-- HWPX_BASE64_BEGIN -->\s*${fence}text\s*(.*?)\s*${fence}\s*<!-- HWPX_BASE64_END -->"
$base64Match = [regex]::Match($specification, $base64Pattern)
if (-not $base64Match.Success) {
  throw "The embedded HWPX Base64 block is missing from the specification."
}

$sourceBytes = [System.Convert]::FromBase64String(($base64Match.Groups[1].Value -replace "\s+", ""))
$sourceSha256 = Get-Sha256Hex $sourceBytes
if ($sourceSha256 -ne $ExpectedSourceSha256) {
  throw "Source HWPX SHA-256 mismatch. Expected $ExpectedSourceSha256, received $sourceSha256."
}

Add-Type -AssemblyName System.IO.Compression
$sourceStream = [System.IO.MemoryStream]::new($sourceBytes)
$sourceArchive = [System.IO.Compression.ZipArchive]::new(
  $sourceStream,
  [System.IO.Compression.ZipArchiveMode]::Read,
  $false
)

try {
  [xml]$sourceDocument = Read-ZipEntryText $sourceArchive "Contents/section0.xml"
  $sourceNamespaces = New-NamespaceManager $sourceDocument
  $sourceTables = @($sourceDocument.SelectNodes("//hp:tbl", $sourceNamespaces))
  if ($sourceTables.Count -ne 18) {
    throw "Expected 18 source tables, found $($sourceTables.Count)."
  }

  $tableIndex = -1
  $mappedCellCount = 0
  $declaredCellCount = 0
  foreach ($line in ($specification -split "\r?\n" | Select-Object -First 585)) {
    if ($line -match '^\*\*(광고물 내역|점검 내역)\*\*.*셀 총 (\d+)개') {
      $tableIndex++
      $declaredCellCount += [int]$Matches[2]
      continue
    }
    if ($line -notmatch '^\| \((\d+),(\d+)\) \| (\d+)×(\d+) \| (.*?) \|$') {
      continue
    }

    $row = [int]$Matches[1]
    $column = [int]$Matches[2]
    $expectedRowSpan = $Matches[3]
    $expectedColumnSpan = $Matches[4]
    $expectedText = Get-NormalizedText $Matches[5]
    $cell = Get-Cell $sourceTables[$tableIndex] $sourceNamespaces $row $column
    $cellSpan = $cell.SelectSingleNode("./hp:cellSpan", $sourceNamespaces)
    $actualText = Get-NormalizedText ((@($cell.SelectNodes(".//hp:t", $sourceNamespaces) | ForEach-Object { $_.InnerText })) -join " ")

    if ($cellSpan.GetAttribute("rowSpan") -ne $expectedRowSpan -or
      $cellSpan.GetAttribute("colSpan") -ne $expectedColumnSpan -or
      $actualText -cne $expectedText) {
      throw "Specification mismatch at source table $tableIndex cell ($row,$column)."
    }
    $mappedCellCount++
  }

  $xmlCellCount = $sourceDocument.SelectNodes("//hp:tc", $sourceNamespaces).Count
  if ($tableIndex -ne 17 -or $mappedCellCount -ne 471 -or $declaredCellCount -ne 471 -or $xmlCellCount -ne 471) {
    throw "Expected all 18 tables and 471 cells to be verified. Tables=$($tableIndex + 1), mapped=$mappedCellCount, declared=$declaredCellCount, XML=$xmlCellCount."
  }

  $sourceParagraphs = @($sourceDocument.DocumentElement.SelectNodes("./hp:p", $sourceNamespaces))
  $sectionControlRuns = @($sourceParagraphs[0].SelectNodes("./hp:run[hp:secPr or hp:ctrl]", $sourceNamespaces))
  if ($sectionControlRuns.Count -eq 0) {
    throw "The source section controls are missing from the first paragraph."
  }
  $outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
  [System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

  $manifestTemplates = [ordered]@{}
  foreach ($definition in $TemplateDefinitions) {
    $document = [System.Xml.XmlDocument]::new()
    $document.PreserveWhitespace = $true
    $document.LoadXml($sourceDocument.OuterXml)
    $namespaces = New-NamespaceManager $document
    $paragraphs = @($document.DocumentElement.SelectNodes("./hp:p", $namespaces))
    $titleParagraph = $paragraphs[$definition.start]

    if ($definition.start -ne 0) {
      for ($controlIndex = $sectionControlRuns.Count - 1; $controlIndex -ge 0; $controlIndex--) {
        $importedControl = $document.ImportNode($sectionControlRuns[$controlIndex], $true)
        $titleParagraph.InsertBefore($importedControl, $titleParagraph.FirstChild) | Out-Null
      }
    }
    $titleParagraph.SetAttribute("pageBreak", "0")
    if ($definition.id -eq "T08") {
      Set-NodeToken $titleParagraph $namespaces "wallRenewalTitle"
    }

    for ($paragraphIndex = $paragraphs.Count - 1; $paragraphIndex -ge 0; $paragraphIndex--) {
      if ($paragraphIndex -lt $definition.start -or $paragraphIndex -gt $definition.end) {
        $document.DocumentElement.RemoveChild($paragraphs[$paragraphIndex]) | Out-Null
      }
    }

    $namespaces = New-NamespaceManager $document
    $tables = @($document.SelectNodes("//hp:tbl", $namespaces))
    if ($tables.Count -ne 2) {
      throw "$($definition.id) should contain exactly two tables, found $($tables.Count)."
    }
    $topTable = $tables[0]
    $reviewTable = $tables[1]
    if ($topTable.GetAttribute("id") -ne $sourceTables[$definition.topTable].GetAttribute("id") -or
      $reviewTable.GetAttribute("id") -ne $sourceTables[$definition.reviewTable].GetAttribute("id")) {
      throw "$($definition.id) selected an unexpected source table pair."
    }
    foreach ($table in $tables) {
      $paragraph = $table.SelectSingleNode("ancestor::hp:p[1]", $namespaces)
      $lineLayout = $paragraph.SelectSingleNode("./hp:linesegarray", $namespaces)
      if ($null -ne $lineLayout) {
        $paragraph.RemoveChild($lineLayout) | Out-Null
      }
    }

    switch ($definition.type) {
      "change" {
        Set-NodeToken (Get-Cell $topTable $namespaces 0 1) $namespaces "permitNumberLabel"
        $topTokens = [ordered]@{
          "2,0" = "signType"; "2,1" = "permitOrReportNo"; "2,2" = "installationAddress";
          "2,3" = "lighting"; "2,4" = "specification"; "2,5" = "previousDisplayText";
          "2,6" = "displayText"; "2,7" = "quantity"; "2,8" = "currentPeriod"
        }
      }
      "renewal" {
        Set-NodeToken (Get-Cell $topTable $namespaces 0 1) $namespaces "permitNumberLabel"
        $topTokens = [ordered]@{
          "2,0" = "signType"; "2,1" = "permitOrReportNo"; "2,2" = "installationAddress";
          "2,3" = "applicantDisplayText"; "2,4" = "specification"; "2,5" = "quantity";
          "2,6" = "periodBefore"; "2,7" = "periodAfter"
        }
      }
      "multiFace" {
        $topTokens = [ordered]@{
          "1,0" = "signType"; "1,1" = "applicant"; "1,2" = "installationAddress";
          "1,3" = "displayText"; "1,4" = "specification"; "1,5" = "quantity";
          "2,4" = "specification2"
        }
      }
      default {
        $topTokens = [ordered]@{
          "1,0" = "signType"; "1,1" = "applicant"; "1,2" = "installationAddress";
          "1,3" = "displayText"; "1,4" = "specification"; "1,5" = "quantity"
        }
      }
    }

    if ($definition.id -eq "T08") { $topTokens.Remove("2,3") }
    foreach ($mapping in $topTokens.GetEnumerator()) {
      $coordinate = $mapping.Key.Split(",")
      Set-NodeToken (Get-Cell $topTable $namespaces ([int]$coordinate[0]) ([int]$coordinate[1])) $namespaces $mapping.Value -CompactCell:($definition.id -eq "T08")
    }

    if ($definition.id -eq "T08") {
      $kindHeading = (Get-Cell $topTable $namespaces 0 0).SelectSingleNode("./hp:subList/hp:p", $namespaces)
      $numberHeading = (Get-Cell $topTable $namespaces 0 1).SelectSingleNode("./hp:subList/hp:p", $namespaces)
      $numberHeading.SetAttribute("paraPrIDRef", $kindHeading.GetAttribute("paraPrIDRef"))
      $numberHeading.SelectSingleNode("./hp:run", $namespaces).SetAttribute(
        "charPrIDRef", $kindHeading.SelectSingleNode("./hp:run", $namespaces).GetAttribute("charPrIDRef"))
      Set-NodeToken (Get-Cell $topTable $namespaces 0 3) $namespaces "wallApplicantHeading"
      $applicantParagraphs = (Get-Cell $topTable $namespaces 2 3).SelectNodes("./hp:subList/hp:p", $namespaces)
      Set-NodeToken ($applicantParagraphs.Item(0)) $namespaces "wallApplicantName"
      Set-NodeToken ($applicantParagraphs.Item(1)) $namespaces "displayText"
      Set-NodeToken (Get-Cell $reviewTable $namespaces 1 0) $namespaces "wallRegionHeading"
      Set-NodeToken (Get-Cell $reviewTable $namespaces 10 0) $namespaces "wallSafetyHeading"
      Set-TableRowMinimumHeight $topTable $namespaces 2 4800
      Set-TableRowMinimumHeight $reviewTable $namespaces 1 5000
      Set-TableRowMinimumHeight $reviewTable $namespaces 6 6200
      Set-TableRowMinimumHeight $reviewTable $namespaces 10 3300
    }

    $reviewRows = @($reviewTable.SelectNodes("./hp:tr", $namespaces))
    $checks = @()
    for ($rowIndex = 1; $rowIndex -lt $reviewRows.Count; $rowIndex++) {
      if ($definition.id -eq "T07" -and $rowIndex -eq 7) {
        Set-NodeToken (Get-Cell $reviewTable $namespaces 7 2) $namespaces "row6Value2"
        continue
      }

      $key = "row$rowIndex"
      $labelCell = Get-Cell $reviewTable $namespaces $rowIndex 0
      $standardCell = Get-Cell $reviewTable $namespaces $rowIndex 1
      $valueCell = Get-Cell $reviewTable $namespaces $rowIndex 2
      $statusCell = Get-Cell $reviewTable $namespaces $rowIndex 3
      $label = Get-NormalizedText ((@($labelCell.SelectNodes(".//hp:t", $namespaces) | ForEach-Object { $_.InnerText })) -join " ")
      if ($definition.id -eq "T08" -and $rowIndex -eq 1) {
        $label = "「국토의 계획 및 이용에 관한 법률」에 따른 지역"
      }
      if ($definition.id -eq "T08" -and $rowIndex -eq 10) {
        $label = "안전점검"
      }
      $standardText = Get-NormalizedText ((@($standardCell.SelectNodes(".//hp:t", $namespaces) | ForEach-Object { $_.InnerText })) -join " ")
      Set-NodeToken $valueCell $namespaces "${key}Value"
      Set-NodeToken $statusCell $namespaces "${key}Status"
      if ($definition.id -eq "T08" -and $rowIndex -eq 1) {
        $firstParagraph = $standardCell.SelectSingleNode("./hp:subList/hp:p[1]", $namespaces)
        $bullet = $firstParagraph.SelectSingleNode("./hp:run/hp:t[normalize-space(.) = '○']", $namespaces)
        $bullet.InnerText = " ○ "
        $bullet.ParentNode.SetAttribute("charPrIDRef", "94")
        $lineLayout = $firstParagraph.SelectSingleNode("./hp:linesegarray", $namespaces)
        if ($null -ne $lineLayout) { $firstParagraph.RemoveChild($lineLayout) | Out-Null }
      }
      if ($definition.id -eq "T08" -and $rowIndex -eq 6) {
        $standardText = (@($standardCell.SelectNodes("./hp:subList/hp:p", $namespaces) | ForEach-Object {
          Get-NormalizedText $_.InnerText
        }) -join "`n")
        Set-NodeToken $standardCell $namespaces "wallRenewalSizeStandard" -CompactCell
        $firstText = $standardCell.SelectSingleNode("./hp:subList/hp:p[1]/hp:run[1]/hp:t", $namespaces)
        $firstText.InnerText = " " + $firstText.InnerText
      }
      if ($definition.id -eq "T08" -and $rowIndex -eq 10) {
        $standardRun = $standardCell.SelectSingleNode(".//hp:run[hp:t[normalize-space(.) != '']]", $namespaces)
        Set-NodeToken $standardRun $namespaces "safetyStandard"
        $standardText = "○ 안전점검 결과와 검사일을 확인"
      }
      $checks += [ordered]@{ key = $key; label = $label; standardText = $standardText }
    }

    $caseParagraphs = @($document.DocumentElement.SelectNodes("./hp:p", $namespaces))
    $opinionLabelIndex = -1
    $reviewerIndex = -1
    $attachmentLabelIndex = -1
    for ($caseIndex = 0; $caseIndex -lt $caseParagraphs.Count; $caseIndex++) {
      $paragraphText = Get-NormalizedText (Get-TopLevelParagraphText $caseParagraphs[$caseIndex] $namespaces)
      if ($opinionLabelIndex -lt 0 -and $paragraphText -match "검토\s*의견") { $opinionLabelIndex = $caseIndex }
      if ($reviewerIndex -lt 0 -and $paragraphText -match "작성자") { $reviewerIndex = $caseIndex }
      if ($attachmentLabelIndex -lt 0 -and $paragraphText -match "첨부\s*목록") { $attachmentLabelIndex = $caseIndex }
    }
    if ($opinionLabelIndex -lt 0 -or $reviewerIndex -lt 0) {
      throw "$($definition.id) is missing its opinion or reviewer paragraph."
    }
    Set-NodeToken (Get-NextTextParagraph $caseParagraphs $opinionLabelIndex $namespaces) $namespaces "reviewOpinion"
    Set-NodeToken $caseParagraphs[$reviewerIndex] $namespaces "reviewer"

    if ($definition.type -eq "change") {
      if ($attachmentLabelIndex -lt 0) { throw "$($definition.id) is missing the attachment list." }
      $attachmentValue = Get-NextTextParagraph $caseParagraphs $attachmentLabelIndex $namespaces
      Set-NodeToken $attachmentValue $namespaces "attachments"
      $removeAttachments = $false
      foreach ($paragraph in @($document.DocumentElement.SelectNodes("./hp:p", $namespaces))) {
        if ($paragraph -eq $attachmentValue) {
          $removeAttachments = $true
          continue
        }
        if ($removeAttachments) {
          $document.DocumentElement.RemoveChild($paragraph) | Out-Null
        }
      }
    }

    $sectionBytes = Convert-XmlDocumentToBytes $document
    $packageBytes = New-TemplatePackage $sourceArchive $sectionBytes
    $fileName = "$($definition.id).hwpx"
    $filePath = Join-Path $outputPath $fileName
    [System.IO.File]::WriteAllBytes($filePath, $packageBytes)

    $manifestTemplates[$definition.id] = [ordered]@{
      file = $fileName
      sha256 = Get-Sha256Hex $packageBytes
      checks = $checks
    }
  }

  $manifest = [ordered]@{
    version = 1
    sourceSha256 = $sourceSha256
    templates = $manifestTemplates
  }
  $manifestJson = $manifest | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText((Join-Path $outputPath "manifest.json"), $manifestJson + [Environment]::NewLine, $Utf8WithoutBom)

  Write-Host "Prepared $($manifestTemplates.Count) HWPX review templates in $outputPath"
  Write-Host "Verified source SHA-256 $sourceSha256 and all $mappedCellCount mapped cells."
} finally {
  $sourceArchive.Dispose()
  $sourceStream.Dispose()
}
