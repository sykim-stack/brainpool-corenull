# brainpool-corenull

CoreNull — BRAINPOOL 생활 공간 엔진

## 역할
공간 제공만 한다. 대화와 번역은 CoreChat/CoreRing에 위임한다.

## 구조
```
House (집)
 └─ Room (방)
      └─ Message (post / event)

Footprint  → 자동 방문 기록
Bookmark   → 수동 저장 (Interest)
Category   → 관심사 태그
```

## 철학
- CoreNull = 공간만
- CoreRing = 댓글/번역
- CoreChat = 대화/알림

## Phase
- Phase 0: House / Room / Post MVP ← 현재
- Phase 1: Footprint UI / Bookmark UI / Event Room
- Phase 2: 서재(Library) / 재탄생 / CoreChat·CoreRing 연동

## 기술 스택
- Next.js
- Supabase (공유 DB)
- Vercel (독립 배포)

## API
- GET/POST /api/corenull/houses
- GET/POST /api/corenull/rooms
- GET/POST /api/corenull/posts

## 코딩 계약
- (ctx) => ctx 형식
- throw 금지 → _error 반환
- req.text() + JSON.parse()
- 200 또는 500만
- 모든 요청에 traceId 필수
