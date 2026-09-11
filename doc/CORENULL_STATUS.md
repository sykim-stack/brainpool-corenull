# CORENULL STATUS
> 기준일: 2026-09-12

## 완료

✅ `/`                홈 (집 목록 + 최근 방문)

✅ `/yard`            마당 (씨앗/꽃/일반 3섹션)

✅ `/write`           글쓰기 + 방 인라인 생성 + 씨앗 토글

✅ `/me`              나 (프로필 + 메뉴)

✅ `/me/library`      서재

✅ `/me/posts`        내가 쓴 이야기

✅ `/houses/[id]`     집 상세 진입 및 마당 리다이렉트

✅ `/houses/create`   집 만들기

✅ `/rooms/[id]`      방 상세 + 포스트 목록

✅ `/posts/[id]`      포스트 상세 + 댓글

✅ `owner_key`        실제 device_id 연동

✅ `messages.owner_key` 컬럼 및 library 사용자별 포스트 필터

✅ 씨앗 세계관      UI 텍스트 반영

✅ 멤버 검증        집주인/Room 멤버만 글쓰기

✅ Room 단위 멤버 권한 검사

✅ yard API         집/방 이름 join + 3섹션 분리

✅ footprints API   room_name join + 중복 제거

✅ 댓글 통합        posts API (`type=comment`, `relations.parent_id`)

✅ 보관/재탄생 통합  posts API PATCH (`action=archive|rebirth`)

✅ 초대 링크         `/api/corenull/invite` 생성·검증·사용

✅ snapshots API    `/api/corenull/snapshots`

✅ `corenull_neighbors` 기반 이웃 기능

## 미완료

⏳ 마당 상단 검은 영역 (CSS 분리 때)

⏳ CSS 분리

⏳ `bloom_date` 카운트다운 UI

⏳ Visibility 3단계 정책 확정

⏳ Neighbor와 초대 자동 부여 로직 확정

⏳ CoreChat·CoreRing 연동 고도화

## 알려진 이슈 및 기술 부채

⚠️ 현재 사용자 식별과 권한의 기반이 localStorage device ID임. 계정 연결 및 서버 세션 계층은 향후 과제.

⚠️ 일부 클라이언트 fetch의 네트워크 오류·재시도 처리가 일관되지 않음.

⚠️ Next.js 및 하위 운영 의존성의 보안 패치 검토 필요.

## 다음 작업 우선순위

1. Next.js 및 운영 의존성 보안 패치와 빌드·배포 검증
2. Visibility 3단계 및 Neighbor→invite 정책 확정
3. CoreChat·CoreRing 연동의 재시도·관측 가능성 강화
4. device ID 기반 권한 모델의 계정·세션 확장 설계
5. CSS 분리 및 `bloom_date` 카운트다운 UI

## API 통합 규칙

댓글은 별도 API 라우트가 아니라 posts API의 `type=comment`와 `relations.parent_id`로 처리한다.

보관·재탄생은 별도 API 라우트가 아니라 posts API PATCH의 `action=archive|rebirth`로 처리한다.
