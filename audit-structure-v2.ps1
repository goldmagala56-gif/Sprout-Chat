# Run from your project root: C:\Users\user\Desktop\Sprout Chat
# Usage:  powershell -ExecutionPolicy Bypass -File .\audit-structure.ps1

Write-Host ""
Write-Host "=== 1. Is pages inside src, or at project root? ===" -ForegroundColor Cyan
$pagesInSrc = Test-Path ".\src\pages"
$pagesAtRoot = Test-Path ".\pages"
Write-Host "src\pages exists: $pagesInSrc"
Write-Host "root-level pages exists: $pagesAtRoot"

if ($pagesAtRoot -and -not $pagesInSrc) {
    Write-Host "PROBLEM CONFIRMED: pages folder is at project root, not inside src." -ForegroundColor Red
}
if ($pagesInSrc -and $pagesAtRoot) {
    Write-Host "PROBLEM: BOTH exist, likely duplicate page files." -ForegroundColor Red
}
if ($pagesInSrc -and -not $pagesAtRoot) {
    Write-Host "OK: pages is correctly inside src." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 2. Other folders misplaced at root? ===" -ForegroundColor Cyan
$foldersToCheck = @("components", "hooks", "context", "lib", "utils")
foreach ($folder in $foldersToCheck) {
    $atRoot = Test-Path ".\$folder"
    $inSrc = Test-Path ".\src\$folder"
    if ($atRoot -and -not $inSrc) {
        Write-Host "MISPLACED: .\$folder exists at root but not in src\$folder" -ForegroundColor Red
    }
    if ($atRoot -and $inSrc) {
        Write-Host "SPLIT: .\$folder exists in BOTH root and src" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== 3. Files still using the patched ../src/ import workaround ===" -ForegroundColor Cyan
Get-ChildItem -Recurse -Include *.jsx,*.js -Exclude node_modules -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    Select-String -Pattern "from '\.\./src/" -List |
    Select-Object -ExpandProperty Path

Write-Host ""
Write-Host "=== 4. Duplicate filenames anywhere in the project ===" -ForegroundColor Cyan
$allFiles = Get-ChildItem -Recurse -Include *.jsx,*.js -Exclude node_modules -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" }
$grouped = $allFiles | Group-Object Name | Where-Object { $_.Count -gt 1 }
foreach ($g in $grouped) {
    Write-Host "DUPLICATE: $($g.Name)" -ForegroundColor Red
    foreach ($item in $g.Group) {
        Write-Host "  - $($item.FullName)"
    }
}

Write-Host ""
Write-Host "=== 5. PWA files present? ===" -ForegroundColor Cyan
$pwaFiles = @(".\public\manifest.json", ".\public\sw.js", ".\public\icons\icon-192.png", ".\public\icons\icon-512.png")
foreach ($f in $pwaFiles) {
    $exists = Test-Path $f
    Write-Host "$f : $exists"
}

Write-Host ""
Write-Host "=== 6. Is manifest.json linked from index.html? ===" -ForegroundColor Cyan
if (Test-Path ".\index.html") {
    Select-String -Path ".\index.html" -Pattern "manifest"
} else {
    Write-Host "index.html not found at project root" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 7. Is the service worker registered anywhere in src? ===" -ForegroundColor Cyan
if (Test-Path ".\src") {
    Get-ChildItem -Recurse -Include *.jsx,*.js -Path .\src -ErrorAction SilentlyContinue |
        Select-String -Pattern "serviceWorker.register" -List |
        Select-Object -ExpandProperty Path
}

Write-Host ""
Write-Host "=== 8. Full current src and pages structure ===" -ForegroundColor Cyan
if (Test-Path ".\src") {
    Get-ChildItem -Recurse .\src -Include *.jsx,*.js -ErrorAction SilentlyContinue | Select-Object FullName
}
if (Test-Path ".\pages") {
    Get-ChildItem -Recurse .\pages -Include *.jsx,*.js -ErrorAction SilentlyContinue | Select-Object FullName
}

Write-Host ""
Write-Host "Done. Paste the full output back." -ForegroundColor Green
