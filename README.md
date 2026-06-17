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