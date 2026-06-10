# CORENULL STATUS
> 마지막 업데이트: 2026-06-10

---

## 배포 현황

| 항목 | 상태 |
|---|---|
| GitHub | `sykim-stack/brainpool-corenull` ✅ |
| Vercel | `corenull.vercel.app` ✅ |
| Supabase | `grlfocvlfatuvphkyivd` ✅ |

---

## API 완료 현황

```
✅ GET/POST  /api/corenull/houses
✅ GET/POST  /api/corenull/rooms
✅ GET/POST  /api/corenull/posts
✅ POST      /api/corenull/upload
✅ GET       /api/corenull/footprints
✅ GET/POST/DELETE /api/corenull/bookmarks
✅ GET       /api/corenull/library
✅ GET/PATCH /api/corenull/archive
✅ POST      /api/corenull/rebirth
✅ GET/POST  /api/corenull/comments
✅ GET       /api/corenull/yard
```

---

## UI 화면 완료 현황

```
✅ / (홈)               집 목록 + 최근 방문 + 집 만들기
✅ /yard (마당)          public 피드 + 포스트 카드
✅ /write (작성)         글쓰기 + 이미지 업로드
✅ /me (나)             프로필 + 활동 요약 + 메뉴
✅ /me/library (서재)    발자취 / 저장 / 내 글 탭
✅ /posts/[id]          포스트 상세 + 댓글 작성
✅ /houses/[id]         집 상세 + 방 목록
✅ /houses/create       집 만들기 (언어 선택 포함)
```

---

## 미완성 화면

```
⏳ /rooms/[id]                  방 상세 + 포스트 목록
⏳ /houses/[id]/rooms/create    방 만들기
⏳ /me/posts                    내 글 목록
```

---

## DB 완료 현황

```
✅ corenull_houses      (primary_language 포함)
✅ corenull_rooms       (visibility, event_mode, slug)
✅ corenull_footprints
✅ corenull_bookmarks
✅ corenull_categories  (구 interests)
✅ corenull_house_members
✅ corenull_milestones
```

---

## BRAINPOOL 전체 현황

```
✅ CoreRing   운영 중 (음성/RLS/온보딩 완료)
✅ CoreChat   운영 중
✅ CoreNull   Phase 2 완료 + UI 진행 중
✅ CoreHub    Phase 0 엔진 완료 + hajun 라우터 연결
✅ brainpool-os 배포 완료
```

---

## 다음 작업 우선순위

### 즉시
```
1. /rooms/[id] 방 상세 페이지
2. /houses/[id]/rooms/create 방 만들기
3. /me/posts 내 글 목록
```

### 이후
```
4. CoreNull ↔ CoreRing 연동 (Phase 3-A)
   - 포스트 자동 번역 (primary_language 기준)
   - 댓글 번역

5. CoreNull ↔ CoreChat 연동 (Phase 3-B)
   - 방 안에서 채팅 연결

6. 레이아웃 정리
   - 상단 검은 영역 수정
   - 최근 방문 room_id → room_name 표시
```

### 보류
```
- 광장 (마당 확장 / 사용자 증가 후)
- 재탄생 UI
- AI 캡션 추천
- 활동 통계
```

---

## 알려진 이슈

```
⚠️ 최근 방문 목록 room_id만 표시됨 (room_name 미연결)
⚠️ 포스트 상세 작성자 정보 미연결 (owner_key → 닉네임)
⚠️ 마당 포스트 집/방 이름 미연결 (room_id만 표시)
⚠️ owner_key 현재 하드코딩 (test-device-001)
```

---

## 전달 사항 (타 클로)

### CoreRing 전담 클로
```
- /api/corenull → /api/phrase 이름 변경 ✅ 완료
- CoreNullLayer 정리 ✅ 완료
- Phase 3-A 연동 준비 필요:
  messages 테이블 공유
  type: "comment" + relations.parent_id 구조

✅ /rooms/[id]          방 상세 + 포스트 목록
✅ /me/posts            내가 쓴 이야기
✅ rooms API            room_id 단건 조회
✅ houses API           house_id 단건 조회
✅ yard API             집/방 이름 join
✅ footprints API       room_name join + 중복 제거
✅ 홈                   최근 방문 room_name 표시 + 클릭 이동