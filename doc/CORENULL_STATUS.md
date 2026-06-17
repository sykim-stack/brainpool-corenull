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

⚠️ next 보안 패치 14.2.35 적용 (완료 — package.json/package-lock.json 확인)

## 다음 작업 우선순위

houses/[houseId]/page.tsx OWNER_KEY 하드코딩 제거
messages 테이블 owner_key 컬럼 추가
posts API owner_key 저장 + library 필터 정상 동작 확인
comments/archive/rebirth → messages 통합 (API 슬롯 확보 — Phase 3 선행 작업)
