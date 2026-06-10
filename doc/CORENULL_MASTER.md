# CORENULL MASTER DOCUMENT
> 작성일: 2026-06-10  
> 버전: Phase 2  
> 이 문서는 CoreNull의 철학, 설계, 주요 결정사항의 기준문서다.

---

## 1. 철학

### 핵심 정의
> "언어가 없는 생활 공간"

CoreNull은 SNS가 아니다. 사람의 삶과 관계를 기록하는 **디지털 집**이다.

### 공간 철학
```
🏡 집    → 머무름 (관계 생성)
🌳 마당  → 발견   (관계 연결)
🏛 광장  → 참여   (공동체 형성) ← Phase 3+ 이후
```

- **집** = 가족, 개인, 친구, 소규모 관계 중심
- **마당** = 이웃 발견, 소식 공유, 가벼운 대화
- **광장** = 마당의 확장형. 사용자가 충분히 모였을 때 자연 분리

### 언어 철학
- "번역"이라는 단어를 쓰지 않는다
- `primary_language` = 이 집에서 태어나는 이야기의 원본 언어
- 방문자는 자동으로 자신의 언어로 읽힌다
- 누구도 번역했다는 사실을 의식하지 않는다

### 기록 철학
```
작성 → 발행 → 보관 → 재탄생
```
- 버려진 글이 아니라 "다시 살아날 수 있는 글"
- 재탄생 = 원본 유지 + 새 포스트 생성 (원본 수정 절대 금지)

### 사용자 철학
- 로그인 최소화, 즉시 사용, 진입장벽 제거
- `owner_key` = 현재 device_id / 미래 user_id
- 좋아요 없음 → 발자취(자동) + 관심(수동)으로 대체

---

## 2. 공간 구조

```
House (집)
 └─ Room (방)
      └─ Message (type: post | event | comment)

Footprint  → 자동 방문 기록
Bookmark   → 수동 저장 (= Interest)
Category   → 관심사 태그
```

---

## 3. 서비스 역할 분리

```
CoreNull  = 공간 (House / Room / Post)
CoreRing  = 해석 (댓글 / 번역)
CoreChat  = 흐름 (대화 / 알림)
CoreHub   = 운영 인텔리전스 (활동점수 / 키워드 / 창고)
```

- **CoreNull**은 공간만 제공
- 댓글은 CoreRing 영역이나 messages 테이블 공유
- 채팅은 CoreChat 영역

---

## 4. DB 구조

### Supabase 프로젝트
- Project ID: `grlfocvlfatuvphkyivd`

### 테이블 목록
| 테이블 | 역할 |
|---|---|
| `corenull_houses` | 집 (owner_key, primary_language) |
| `corenull_rooms` | 방 (visibility, event_mode, slug) |
| `corenull_house_members` | 집 멤버 |
| `corenull_footprints` | 자동 방문 기록 |
| `corenull_bookmarks` | 수동 저장 |
| `corenull_categories` | 관심사 태그 (구 interests) |
| `corenull_milestones` | 마일스톤 |
| `messages` | 모든 데이터 (type: post/comment/chat/event) |

### messages 테이블 type 규칙
```
type: "post"    → CoreNull 포스트
type: "comment" → 댓글 (relations.parent_id = 포스트ID)
type: "chat"    → CoreChat
type: "event"   → 이벤트 포스트
```

### 보관/재탄생 메타 규칙
```
meta.archived = true        → 보관됨
meta.reborn_from = post_id  → 재탄생 원본 연결
```

### primary_language 코드
```
ko → 🇰🇷 한국어
vi → 🇻🇳 베트남어
en → 🇺🇸 영어
ja → 🇯🇵 일본어
zh → 🇨🇳 중국어
```

---

## 5. API 구조

### 레포 및 배포
- GitHub: `sykim-stack/brainpool-corenull`
- Vercel: `corenull.vercel.app`
- Supabase: 공유 DB

### API 목록
| Method | Path | 설명 |
|---|---|---|
| GET/POST | `/api/corenull/houses` | 집 조회/생성 (생성 시 "일상" 방 자동 생성) |
| GET/POST | `/api/corenull/rooms` | 방 조회/생성 (집주인만 생성 가능) |
| GET/POST | `/api/corenull/posts` | 포스트 조회/작성 (방문 시 Footprint 자동 기록) |
| POST | `/api/corenull/upload` | 이미지/영상 업로드 (Supabase Storage) |
| GET | `/api/corenull/footprints` | 발자취 조회 |
| GET/POST/DELETE | `/api/corenull/bookmarks` | 관심 저장/조회/삭제 |
| GET | `/api/corenull/library` | 서재 (발자취+저장+내포스트 한번에) |
| GET/PATCH | `/api/corenull/archive` | 보관 처리/조회 |
| POST | `/api/corenull/rebirth` | 재탄생 |
| GET/POST | `/api/corenull/comments` | 댓글 조회/작성 |
| GET | `/api/corenull/yard` | 마당 피드 (public 방 전체 포스트) |

### 코딩 계약
```
- throw 금지 → _error 반환만
- req.text() + JSON.parse() (req.json() 금지)
- HTTP 응답: 200 또는 500만
- 모든 요청에 traceId 필수
- export const dynamic = 'force-dynamic' 필수
```

---

## 6. UI 구조

### 기술 스택
- Next.js 14 App Router
- Supabase JS
- 색상 토큰 (earth/nature tones)

### 색상 시스템
```
--soil: #2C1810      → 주요 텍스트, 버튼
--bark: #5C3D2E      → 보조
--moss: #4A5240      → 공간 태그
--leaf: #7A8C6E      → 커버
--sky:  #C8D5B9      → 배경 포인트
--paper: #F5F0E8     → 카드 배경
--cream: #FBF8F2     → 전체 배경
--warm-white: #FEFCF8 → 카드
--accent: #C17F3C    → 강조
```

### URL 구조
```
/               → 홈
/yard           → 마당
/write          → 작성
/me             → 나
/me/library     → 서재
/me/posts       → 내 글
/houses/[id]    → 집 상세
/houses/create  → 집 만들기
/rooms/[id]     → 방 상세
/posts/[id]     → 포스트 상세
```

### 포스트 카드 규칙
```
공간 먼저 (집·방 → 작성자)
미디어 3가지 분기 (없음/이미지/영상)
번역 접기/펼치기 (다른 언어일 때만)
하단 버튼 2개만 (💬 🔖)
발자취는 포스트 상세에서
```

---

## 7. Supabase Storage

### 버킷
```
voice-recordings  → CoreRing 음성
corenull-images   → 이미지 (PUBLIC)
corenull-videos   → 영상 (PUBLIC)
```

### 경로 규칙
```
corenull-images/{post_id}/{uuid}.{ext}
corenull-videos/{post_id}/{uuid}.{ext}
orphan/{uuid}.{ext}  → post_id 없을 때
```

---

## 8. 주요 설계 결정 기록

| 결정 | 이유 |
|---|---|
| messages 통합 테이블 | CoreRing/CoreChat/CoreNull 공유 |
| house_id 레거시 처리 | 실제 데이터 없음 확인, room_id만 사용 |
| corenull_interests → corenull_categories | 개념 충돌 해소 |
| primary_language (default_language 아님) | "번역 기준"이 아닌 "원본 언어" 철학 |
| 재탄생 = 원본 유지 + 새 포스트 | 예전 생각과 지금 생각 모두 보존 |
| 집 생성 시 "일상" 방 자동 생성 | 진입장벽 제거 |
| yard API 별도 생성 | public 방 전체 피드 필요 |