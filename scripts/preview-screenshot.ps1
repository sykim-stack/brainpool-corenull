<#
.SYNOPSIS
  brainpool-corenull 로컬 dev 서버 화면을 Edge headless로 스크린샷한다.
.DESCRIPTION
  browser_navigate 도구는 Next.js SPA가 pending fetch(/api/corenull/*) 상태에서
  load 이벤트가 달성되지 않아 항상 420s 타임아웃이 발생한다.
  이 스크립트는 localhost dev 서버에 대해 Edge --headless --screenshot 로
  시각 검증을 수행한다 (Vercel Edge warm-up 불필요, 즉시 캡처).

  dev server가 꺼져 있어도 감지해 자동 시작한다 (절전/잠자기 복구 self-heal).
#>
param(
  [string]$Page = "plaza",
  [string]$Out,
  [switch]$Desktop,
  [string]$Base = "http://localhost:3000"
)

$ts    = Get-Date -Format "yyyyMMdd_HHmmss"
$label = if ($Desktop) { "desktop" } else { "mobile" }
if (-not $Out) { $Out = "${Page}_${label}_$ts" }

$outDir = "$env:USERPROFILE\plaza-previews"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$outPath = "$outDir\$Out.png"

# Edge native 경로 (PowerShell env var 로 MSYS path 변환 문제 없음)
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe" }
if (-not (Test-Path $edge)) {
  Write-Error "Edge 브라우저를 찾을 수 없습니다: $edge"
  exit 1
}

# repo root = 이 스크립트가 있는 scripts/ 폴더의 부모 (dev server 자동 시작용)
$repoRoot = Split-Path -Parent $PSScriptRoot

function Test-ServerUp {
  # HTTP body 쓰기 실패가 Invoke-WebRequest 를 false 로 만드므로, TCP 포트 수신 여부로 판단
  $t = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
  return ($null -ne $t -and $t.TcpTestSucceeded)
}

function Stop-StaleDev {
  # port 3000 에 LISTEN 중인 stale next-dev 정리 (절전/잠자기 복구 후 좀상류 방지)
  $lines = netstat -ano 2>$null | Where-Object { $_ -match 'LISTENING' -and $_ -match ':3000\s' }
  foreach ($ln in $lines) {
    $procId = ($ln -split '\s+')[-1]
    if ($procId -and $procId -ne '0') { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
  }
}

# dev server reachability + self-heal (절전 후 꺼지면 자동 재시작)
if (-not (Test-ServerUp)) {
  Write-Output "dev server가 꺼져 있음 — 자동 시작 (self-heal)..."
  Stop-StaleDev
  # npm 은 npm.ps1 (스크립트) 일 수 있어 cmd.exe /c 사용 (npm.cmd 자동 해석)
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $repoRoot -WindowStyle Hidden
  $ready = $false
  foreach ($i in 1..24) {
    Start-Sleep -Seconds 1
    if (Test-ServerUp) { $ready = $true; break }
  }
  if (-not $ready) {
    Write-Error "dev server 시작 실패. '$repoRoot' 에서 'npm run dev' 를 직접 실행해 보세요."
    exit 1
  }
  Write-Output "dev server 준비 완료."
}

if ($Desktop) { $size = "1280,800" } else { $size = "390,844" }
$url = "$Base/$Page"
Write-Output "Capturing $url ($label $size) -> $outPath"

# 배열 형태로 인자 전달 (공백/따옴표 문제 회피). $args 는 자동 변수이므로 $edgeArgs 사용
$edgeArgs = @(
  "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
  "--virtual-time-budget=10000", "--window-size=$size",
  "--screenshot=$outPath", $url
)
& "$edge" @edgeArgs

# msedge --headless=new 가 detach 후 파일을 쓰는 레이스 방지: 생성을 폴링
$captured = $false
for ($i = 0; $i -lt 20; $i++) {
  if (Test-Path $outPath) { $captured = $true; break }
  Start-Sleep -Milliseconds 500
}
if ($captured) {
  $bytes = (Get-Item $outPath).Length
  Write-Output "Saved: $outPath ($bytes bytes)"
} else {
  Write-Error "스크린샷이 저장되지 않았습니다. Edge 버전이나 --headless=new 지원 여부를 확인하세요."
}
