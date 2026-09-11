# CORENULL MASTER DOCUMENT v3
> 기준일: 2026-09-12
> BRAINPOOL MASTER PROMPT v1 기준

## 철학
- CoreNull = 공간만 (View Layer)
- 언어가 없는 생활 공간
- 집을 따라 이동하는 마을

## 공간 구조
House (집)

└─ Room (방)

└─ Message (type: post | event | comment | fruit)
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
| corenull_house_members | 멤버 (House/Room 범위) |
| corenull_neighbors | 집 간 이웃 관계 |
| corenull_footprints | 자동 방문 기록 |
| corenull_bookmarks | 수동 저장 |
| corenull_invite_tokens | 초대 링크 |
| messages | 모든 데이터 |

## messages type 규칙
`type: "post"` → 일반 포스트

`type: "event"` → 씨앗 (seed_mode=true 방의 글)

`type: "comment"` → 댓글 (`relations.parent_id`로 포스트 연결)

`type: "fruit"` → 재탄생·수확 대상 열매

댓글·보관·재탄생은 별도 API 라우트가 아니라 posts API의 type 및 PATCH action으로 처리한다.

## API 목록

| Method | Path | 설명 |
|---|---|---|
| GET/POST | `/api/corenull/houses` | 집 조회/생성 및 이웃 조회 |
| GET/POST | `/api/corenull/rooms` | 방 조회/생성 |
| GET/POST/PATCH | `/api/corenull/posts` | 포스트·댓글·열매 조회/작성 및 상태 변경 |
| POST | `/api/corenull/upload` | 미디어 업로드 |
| GET | `/api/corenull/footprints` | 발자취 조회 |
| GET/POST/PATCH | `/api/corenull/bookmarks` | 북마크 조회·생성·상태 변경 |
| GET/POST/DELETE | `/api/corenull/members` | 멤버 조회·관리 |
| GET | `/api/corenull/library` | 서재 조회 |
| GET/POST/PATCH | `/api/corenull/invite` | 초대 토큰 생성·검증·사용 |
| GET/POST | `/api/corenull/snapshots` | 스냅샷 조회·생성 |
| GET | `/api/corenull/yard` | 마당 피드 |

> 댓글은 posts API의 `type=comment`와 `relations.parent_id`로 처리한다.
> 보관·재탄생은 posts API PATCH의 `action=archive|rebirth`로 처리한다.
> 실제 라우트 수는 Vercel Hobby 한도 내에서 운영한다.

## 코딩 계약
throw 금지 → _error 반환
req.text() + JSON.parse()
HTTP: 200 또는 500
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
