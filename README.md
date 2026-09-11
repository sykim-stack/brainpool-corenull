# brainpool-corenull

CoreNull — BRAINPOOL 생활 공간 엔진

## 역할
공간 제공만 한다. 대화와 번역은 CoreChat/CoreRing에 위임한다.

## 구조
House (집)

└─ Room (방)

└─ Message (post / event / comment / fruit)
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
- Phase 2: 서재(Library) / 재탄생 / 멤버 관리 / 초대 링크 / snapshots ✅ 완료
- Phase 3: CoreChat·CoreRing 연동 고도화 ⏳ 진행 예정 — 기본 posts 연동은 구현되어 있으며 재시도·관측 가능성 보강 필요

## 기술 스택
- Next.js 14 (App Router)
- Supabase (공유 DB)
- Vercel (독립 배포, Hobby 플랜)

## API
- GET/POST `/api/corenull/houses`
- GET/POST `/api/corenull/rooms`
- GET/POST/PATCH `/api/corenull/posts` — 댓글·보관·재탄생 포함
- POST `/api/corenull/upload`
- GET `/api/corenull/footprints`
- GET/POST/PATCH `/api/corenull/bookmarks`
- GET/POST/DELETE `/api/corenull/members`
- GET `/api/corenull/library`
- GET/POST/PATCH `/api/corenull/invite`
- GET/POST `/api/corenull/snapshots`
- GET `/api/corenull/yard`

> 댓글은 posts API의 `type=comment`와 `relations.parent_id`로 처리한다.
> 보관·재탄생은 posts API PATCH의 `action=archive|rebirth`로 처리한다.

## 코딩 계약
- `(ctx) => ctx` 형식
- throw 금지 → `_error` 반환
- `req.text()` + `JSON.parse()`
- 200 또는 500만
- 모든 요청에 traceId 필수
