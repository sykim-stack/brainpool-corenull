$repoRoot = "G:\brainpool-corenull"

# ── 1. doc/CORENULL_MASTER.md ──────────────────────────────
$master = @'
# CORENULL MASTER DOCUMENT v2
> 기준일: 2026-06-17
> BRAINPOOL MASTER PROMPT v1 기준

## 철학
- CoreNull = 공간만 (View Layer)
- 언어가 없는 생활 공간
- 집을 따라 이동하는 마을

## 공간 구조
House (집)

└─ Room (방)

└─ Message (type: post | event | comment)
Footprint  → 자동 방문 기록

Bookmark   → 수동 저장

## Seed System (세계관 레이어)
🌱 Seed   = Room(seed_mode=true, bloom_date)

🌿 Growth = Message(type="post") — 씨앗방 안의 기록

🌸 Flower = bloom_date 도달
> Seed는 의미 레이어. DB/API 변경 최소화.
> Master Prompt 예외 조항: seed_mode, bloom_date는 Room(Container)에 실용적 이유로 유지

## DB 구조
| 테이블 | 역할 |
|---|---|
| corenull_houses | 집 |
| corenull_rooms | 방 (seed_mode, bloom_date 포함) |
| corenull_house_members | 멤버 |
| corenull_footprints | 자동 방문 기록 |
| corenull_bookmarks | 수동 저장 |
| corenull_invite_tokens | 초대 링크 (Phase 2) |
| messages | 모든 데이터 |

## messages type 규칙
type: "post"    → 일반 포스트

type: "event"   → 씨앗 (seed_mode=true 방의 글)

type: "comment" → 댓글 (relations.parent_id = 포스트ID)

## API 목록 (12/12 — Vercel Hobby 한도 도달)
| Method | Path | 설명 |
|---|---|---|
| GET/POST | /api/corenull/houses | 집 조회/생성 |
| GET/POST | /api/corenull/rooms | 방 조회/생성 |
| GET/POST | /api/corenull/posts | 포스트 조회/작성 |
| POST | /api/corenull/upload | 미디어 업로드 |
| GET | /api/corenull/footprints | 발자취 조회 |
| GET/POST/DELETE | /api/corenull/bookmarks | 북마크 |
| GET/POST/DELETE | /api/corenull/members | 멤버 관리 |
| GET | /api/corenull/library | 서재 |
| GET/POST | /api/corenull/comments | 댓글 (→ messages 통합 예정) |
| GET/PATCH | /api/corenull/archive | 보관 (→ messages PATCH 통합 예정) |
| POST | /api/corenull/rebirth | 재탄생 (→ messages PATCH 통합 예정) |
| GET | /api/corenull/yard | 마당 피드 |

> 새 라우트 필요 시(CoreChat/CoreRing 연동 등) comments/archive/rebirth를 messages API `?action=` 패턴으로 통합해서 슬롯 확보 필요

## 코딩 계약

throw 금지 → _error 반환
req.text() + JSON.parse()
HTTP: 200 or 500만
모든 요청 traceId 필수
export const dynamic = 'force-dynamic'


## owner_key
현재 → device_id (localStorage: corenull_device_id)

Phase 2 → device_id + 복구코드

Phase 3 → 선택적 계정 연결

## 레포 / 배포
GitHub  → sykim-stack/brainpool-corenull

Vercel  → corenull.vercel.app

Supabase → grlfocvlfatuvphkyivd

로컬 경로 → G:\brainpool-corenull
'@

# ── 2. doc/CORENULL_STATUS.md ──────────────────────────────
$status = @'
# CORENULL STATUS
> 기준일: 2026-06-17

## 완료
✅ /                홈 (집 목록 + 최근 방문)

✅ /yard            마당 (씨앗/꽃/일반 3섹션)

✅ /write           글쓰기 + 방 인라인 생성 + 씨앗 토글

✅ /me              나 (프로필 + 메뉴)

✅ /me/library      서재

✅ /me/posts        내가 쓴 이야기

✅ /houses/[id]     집 상세

✅ /houses/create   집 만들기

✅ /rooms/[id]      방 상세 + 포스트 목록

✅ /posts/[id]      포스트 상세 + 댓글

✅ owner_key        실제 device_id 연동 (houses/[id] 페이지 제외 — 별도 이슈로 기록)

✅ 씨앗 세계관      UI 텍스트 반영

✅ 멤버 검증        집주인/멤버만 글쓰기

✅ yard API         집/방 이름 join + 3섹션 분리

✅ footprints API   room_name join + 중복 제거

## 미완료
⏳ messages owner_key 컬럼 추가 (내 글 필터 버그)

⏳ comments API → messages API 통합

⏳ rebirth/archive → messages PATCH 통합

⏳ 마당 상단 검은 영역 (CSS 분리 때)

⏳ CSS 분리

⏳ 초대 링크 생성/사용 (Phase 2)

⏳ bloom_date 카운트다운 UI (Phase 2)

## 알려진 이슈
⚠️ messages owner_key 없음 → 내 글 전체 조회됨 (library API my_posts 필터 무효화)

⚠️ houses/[houseId]/page.tsx 에 OWNER_KEY = 'test-device-001' 하드코딩 잔존 — getDeviceId() 미적용

⚠️ next@14.2.0 보안 취약점 — 패치 버전 업그레이드 필요

## 다음 작업 우선순위

next 패치 버전 업그레이드 (보안)
houses/[houseId]/page.tsx OWNER_KEY 하드코딩 제거
messages 테이블 owner_key 컬럼 추가
posts API owner_key 저장 + library 필터 정상 동작 확인
comments/archive/rebirth → messages 통합 (API 슬롯 확보 — Phase 3 선행 작업)

'@

# ── 3. README.md ───────────────────────────────────────────
$readme = @'
# brainpool-corenull

CoreNull — BRAINPOOL 생활 공간 엔진

## 역할
공간 제공만 한다. 대화와 번역은 CoreChat/CoreRing에 위임한다.

## 구조
House (집)

└─ Room (방)

└─ Message (post / event / comment)
Footprint  → 자동 방문 기록

Bookmark   → 수동 저장 (Interest)

Category   → 관심사 태그

## 철학
- CoreNull = 공간만
- CoreRing = 댓글/번역
- CoreChat = 대화/알림

## Phase
- Phase 0: House / Room / Post MVP ✅ 완료
- Phase 1: Footprint UI / Bookmark UI / Event Room ✅ 완료
- Phase 2: 서재(Library) / 재탄생 / 멤버 관리 ✅ 완료
- Phase 3: CoreChat·CoreRing 연동 ⏳ 대기 — API 라우트 12개 한도 도달, 통합 작업 선행 필요

## 기술 스택
- Next.js 14 (App Router)
- Supabase (공유 DB)
- Vercel (독립 배포, Hobby 플랜)

## API (12/12 — Vercel Hobby 한도 도달)
- GET/POST /api/corenull/houses
- GET/POST /api/corenull/rooms
- GET/POST /api/corenull/posts
- POST /api/corenull/upload
- GET /api/corenull/footprints
- GET/POST/DELETE /api/corenull/bookmarks
- GET/POST/DELETE /api/corenull/members
- GET /api/corenull/library
- GET/POST /api/corenull/comments
- GET/PATCH /api/corenull/archive
- POST /api/corenull/rebirth
- GET /api/corenull/yard

> 새 라우트 추가 필요 시 comments/archive/rebirth를 messages API `?action=` 패턴으로 통합해 슬롯 확보 필요

## 코딩 계약
- (ctx) => ctx 형식
- throw 금지 → _error 반환
- req.text() + JSON.parse()
- 200 또는 500만
- 모든 요청에 traceId 필수
'@

# ── 쓰기 (BOM 없이) ─────────────────────────────────────────
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

[System.IO.File]::WriteAllText("$repoRoot\doc\CORENULL_MASTER.md", $master, $utf8NoBom)
[System.IO.File]::WriteAllText("$repoRoot\doc\CORENULL_STATUS.md", $status, $utf8NoBom)
[System.IO.File]::WriteAllText("$repoRoot\README.md", $readme, $utf8NoBom)

Write-Host "문서 3개 정리 완료: CORENULL_MASTER.md / CORENULL_STATUS.md / README.md"