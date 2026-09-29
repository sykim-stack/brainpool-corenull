# BRAINPOOL CoreNull — 최적화 개발 환경

> 설계보다 실제 흐름을 우선한다. 재설계보다 연결을 우선한다. 추측보다 증거를 우선한다.
> (doc/README.md 의 설계 철학과 일치)

## 0. 이 환경의 제약 (알면 쓰는 게 빠름)
- **네트워크**: 외부(크롬드/서드파티 에셋) 다운로드는 차단/불안정 → **에셋은 로컬에서 생성** (ffmpeg)
- **browser_navigate / browser_vision**: **항상 420s 타임아웃**. 근본 원인은 Vercel Edge warm-up이 아니라
  Next.js SPA가 `/api/corenull/*` (→ Supabase) pending fetch로 인해 load 이벤트가 달성되지 않기 때문이다.
  → 시각 검증은 **Edge headless screenshot**(scripts/preview-screenshot.ps1) 사용.
- **native binary**: `Edge`, `ffmpeg`, `ffprobe`, `git`(Git for Windows)은 **네이티브 경로(`C:/...`, `G:/...`)** 필요.
  MSYS 변환 경로(`/c/...`)는 native binary에 전달되지 않는다 → "No such file" 발생.
- **`.env.local`**: gitignored. 값은 **절대 출력하지 않는다** (키명만 확인). 13키 모두 값 존재.

## 1. 로컬 dev 서버 (Vercel 420s 타임아움 회피)
```powershell
# PowerShell (사용자 환경)
cd G:\brainpool-corenull
npm run dev        # http://localhost:3000, Ready in ~10s, .env.local 자동 인식
```
```bash
# bash (git-bash / MSYS)
cd /g/brainpool-corenull && npm run dev
```
- `next.config` 없음 → Next 14 기본 설정 (App Router). `.env.local` 13키(프로젝트/Supabase/Vercel).

## 2. 시각 검증 — Edge headless (브라우저 도구 대체)
### 헬퍼 스크립트 (PowerShell, 권장)
```powershell
.\scripts\preview-screenshot.ps1 -Page plaza            # 모바일 390x844
.\scripts\preview-screenshot.ps1 -Page plaza -Desktop  # 데스크탑 1280x800
.\scripts\preview-screenshot.ps1 -Page write -Out write_login
# 출력: $env:USERPROFILE\plaza-previews\<name>.png
```
### 직접 실행 (bash)
```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --virtual-time-budget=10000 --window-size=390,844 \
  --screenshot="C:/Users/iname/plaza-previews/plaza.png" "http://localhost:3000/plaza"
```

## 3. 빌드 / 검증
```bash
npx tsc --noEmit       # 타입 검사 (0)
npm run build          # 정적 빌드 (/plaza 5.24 kB Static)
npm run lint           # eslint (eslint-config-next 번들)
```
- `tsc` 바이너리 없음 → 반드시 **`npx tsc`** (node_modules/.bin/typescript 캐시됨).

## 4. 에셋 로컬 생성 (ffmpeg) — 네트워크 차단 우회
```bash
# native 경로 사용 (ffprobe/ffmpeg는 native binary)
ffmpeg -i "G:/brainpool-corenull/public/alley/alley-05.jpeg" \
  -vf "eq=gamma=1.15:saturation=1.08:contrast=1.08" -q:v 85 plaza-hero.jpg
# 크롭(가로 밴드 추출): crop=w:h:x:y (픽셀 단위)
```

## 5. Git 동기화 (5분 간격, 숨김) — Task Scheduler
- 스크립트: `C:/Users/iname/sync/sync-all-github-repos.ps1` (`--ff-only`, dirty/detached skip)
- 태스크: `github-repos auto-sync` @ PT5M (윈도우 작업 스케줄러)

## 6. 문제 해결
| 현상 | 원인 / 해결 |
|---|---|
| dev server 안 켜짐 | 포트 3000 충돌 → `netstat -ano \| findstr :3000` |
| Edge screenshot 안 됨 | `--headless=new` 미지지 → `--headless` 강제 |
| build 느림 | `.next` 캐시 유지 (`.gitignore` 미포함 — `git status`로 확인) |
| tsc "not found" | `npx tsc` 사용 (전역 tsc 없음) |
| native tool "No such file" | MSYS `/c/...` → 네이티브 `C:/...` 경로로 변환 |
