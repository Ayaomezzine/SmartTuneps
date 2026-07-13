$src = 'C:\Users\samro\AppData\Roaming\Code\User\workspaceStorage\ab9c4b36c5a3ed65b4d657fd1c679f51\GitHub.copilot-chat\chat-session-resources\661e415a-ab12-4c48-92e5-7db00db253e5\call_cBHk7D3ubGxf4Rdq6AMD6lUy__vscode-1782989658337\content.txt'
$dst = 'C:\Users\samro\OneDrive\Bureau\tunepss\tuneps_relevant_consultations.csv'
$raw = Get-Content -Raw -LiteralPath $src
$data = ($raw -replace '^Result:\s*', '') | ConvertFrom-Json

function Get-Language($text) {
  if ($text -match '[\u0600-\u06FF]') { return 'Arabic' }
  return 'French'
}

function Get-Category($text, $matchedBy) {
  if ($text -match 'cartables?|sac a dos|sacs? cartonn[ee]s?|\u0645\u062F\u0631\u0633\u064A\u0629|\u0643\u062A\u0628 \u0645\u062F\u0631\u0633\u064A\u0629' -or $matchedBy -match 'shopNmAr:.*(\u0645\u062F\u0631\u0633\u064A\u0629)') { return 'School supplies' }
  if ($text -match 'papier\s*A4|papier d.?impression|rame(?:s)? papier|imprimes administratifs|\u0648\u0631\u0642 \u0637\u0628\u0627\u0639\u0629|\u0648\u0631\u0642 A4|\u0623\u0648\u0631\u0627\u0642 \u0637\u0628\u0627\u0639\u0629|rouleau papier|papier de caisse' -or $matchedBy -match 'shopNmAr:.*(\u0648\u0631\u0642)') { return 'Printing paper / A4 paper' }
  if ($text -match 'toners?|cartouches?|encre|\u062D\u0628\u0631' -or $matchedBy -match 'shopNmAr:.*(\u062D\u0628\u0631)') { return 'Toners and ink cartridges' }
  if ($text -match 'photocopieur|imprimante|imprimantes?|multifonction|scanner|destructeur(?:s)? de papier|destructeur documents|\u0622\u0644\u0629 \u0637\u0628\u0627\u0639\u0629|\u0622\u0644\u0627\u062A \u0637\u0628\u0627\u0639\u0629|\u0622\u0644\u0629 \u0646\u0627\u0633\u062E\u0629|\u0637\u0627\u0628\u0639\u0629 \u062D\u0631\u0627\u0631\u064A\u0629' -or $matchedBy -match 'shopNmAr:.*(\u0645\u0644\u062D\u0642\u0627\u062A|\u0625\u0642\u062A\u0646\u0627\u0621 \u0622\u0644\u0629 \u0646\u0627\u0633\u062E\u0629)') { return 'Printers / office equipment' }
  if ($text -match 'ordinateur|pc portables?|ordinateur portable|\u0648\u0627\u0633\u064A\u0628? (?:\u0645\u062D\u0645\u0648\u0644\u0629|\u0645\u0643\u062A\u0628\u064A\u0629)|\u062D\u0627\u0633\u0648\u0628|mat[ee]riel(?:s)? informatiques?|\u00E9quipements? informatiques?|consommables? informatiques?|accessoires? informatiques?|\u0645\u0639\u062F\u0627\u062A \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u062A\u062C\u0647\u064A\u0632\u0627\u062A \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u0644\u0648\u0627\u0632\u0645 \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u0645\u0648\u0627\u062F \u0625\u0639\u0644\u0627\u0645\u064A\u0629|consommable informatique' -or $matchedBy -match 'shopNmAr:.*(\u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u062D\u0627\u0633\u0648\u0628|\u0645\u062D\u0645\u0648\u0644|\u0645\u0643\u062A\u0628\u064A\u0629)') { return 'IT consumables / computers / accessories' }
  if ($text -match 'fournitures? de bureau|mat[ee]riel(?:s)? de bureau|mobilier de bureau|meubles? de bureaux?|\u0645\u0648\u0627\u062F \u0645\u0643\u062A\u0628\u064A\u0629|\u0644\u0648\u0627\u0632\u0645 \u0645\u0643\u062A\u0628\u064A\u0629|\u062A\u062C\u0647\u064A\u0632\u0627\u062A \u0645\u0643\u062A\u0628\u064A\u0629|\u0644\u0648\u0627\u0632\u0645 \u0645\u0643\u062A\u0628') { return 'Office supplies' }
  return 'Office / IT supplies'
}

function Get-Confidence($text) {
  if ($text -match 'fournitures? de bureau|\u0645\u0648\u0627\u062F \u0645\u0643\u062A\u0628\u064A\u0629|\u0644\u0648\u0627\u0632\u0645 \u0645\u0643\u062A\u0628\u064A\u0629|papier\s*A4|papier d.?impression|toners?|cartouches?|imprimante|photocopieur|multifonction|ordinateur|pc portables?|mat[ee]riel(?:s)? informatiques?|\u0645\u0639\u062F\u0627\u062A \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u062A\u062C\u0647\u064A\u0632\u0627\u062A \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u0644\u0648\u0627\u0632\u0645 \u0625\u0639\u0644\u0627\u0645\u064A\u0629|\u062D\u0628\u0631') { return 95 }
  if ($text -match 'fourniture.*informatique|fournitures? informatiques?|fournitures? d.?impression et informatiques|fournitures? et mat[ee]riel de bureau|mobilier de bureau|cartables?|\u0645\u062F\u0631\u0633\u064A\u0629|destructeur(?:s)? de papier|scanner') { return 90 }
  return 82
}

function Get-Reason($category) {
  switch ($category) {
    'School supplies' { return 'Contains school-supply terms such as school bags, stationery, or educational supplies.' }
    'Printing paper / A4 paper' { return 'Contains paper terms such as A4 paper, printing paper, administrative prints, or roll paper.' }
    'Toners and ink cartridges' { return 'Contains toner, cartridge, or ink wording.' }
    'Printers / office equipment' { return 'Contains printer, photocopier, scanner, multifunction, or document-shredder wording.' }
    'IT consumables / computers / accessories' { return 'Contains IT equipment, computer, consumable, or accessory wording.' }
    'Office supplies' { return 'Contains office-supply wording such as bureau supplies, office materials, or administrative stationery.' }
    default { return 'Related to office or IT procurement based on the consultation wording.' }
  }
}

function Convert-ToDateTime($value) {
  try {
    return [datetime]::Parse($value, [System.Globalization.CultureInfo]::InvariantCulture)
  }
  catch {
    return $null
  }
}

$rows = foreach ($item in $data.items) {
  $title = @($item.titleFr, $item.titleAr, $item.titleEn) | Where-Object { $_ -and $_.Trim() } | Select-Object -First 1
  $allText = "$($item.titleFr) $($item.titleAr) $($item.titleEn)"
  $category = Get-Category $allText $item.matchedBy
  $language = Get-Language $title
  $englishSummary = if ($item.titleEn -and $item.titleEn -notmatch '[\u0600-\u06FF]') { $item.titleEn.Trim() } else {
    switch ($category) {
      'School supplies' { 'Procurement of school supplies' }
      'Printing paper / A4 paper' { 'Procurement of printing paper and A4 paper' }
      'Toners and ink cartridges' { 'Procurement of toners, cartridges, or ink' }
      'Printers / office equipment' { 'Procurement of printers or office equipment' }
      'IT consumables / computers / accessories' { 'Procurement of IT equipment, consumables, or accessories' }
      'Office supplies' { 'Procurement of office supplies' }
      default { 'Procurement related to office or IT supplies' }
    }
  }
  $deadline = Convert-ToDateTime $item.deadline
  $pub = Convert-ToDateTime $item.publicDt
  $urgent = if ($deadline -le [datetime]::Parse('2026-07-09T23:59:59')) { 'Yes' } else { 'No' }
  [pscustomobject]@{
    ConsultationNumber = $item.shopNo
    OriginalTitle = $title.Trim()
    EnglishSummary = $englishSummary
    Category = $category
    ContractingAuthority = $item.instNm.Trim()
    PublicationDate = $pub.ToString('dd/MM/yyyy HH:mm')
    Deadline = $deadline.ToString('dd/MM/yyyy HH:mm')
    Language = $language
    Confidence = ('{0}%' -f (Get-Confidence $allText))
    Reason = (Get-Reason $category)
    DirectLink = "https://www.tuneps.tn/portail/consultations/consultationdetails/$($item.spShopMasterId)/$($item.shopNo)"
    Urgent = $urgent
  }
}

$rows | Sort-Object {[datetime]::ParseExact($_.Deadline, 'dd/MM/yyyy HH:mm', $null)} | Export-Csv -LiteralPath $dst -NoTypeInformation -Encoding UTF8
Write-Output "Wrote $($rows.Count) rows to $dst"