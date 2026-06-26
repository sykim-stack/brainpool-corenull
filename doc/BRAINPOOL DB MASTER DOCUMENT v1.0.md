# BRAINPOOL DB MASTER DOCUMENT v1.0
_기준일: 2026-06-23_

---

## 핵심 원칙

Message는 하나다. CoreNull/CoreChat/CoreRing은 하나의 `messages` 테이블을 공유한다.
단, 미래를 가정한 과도한 일반화는 하지 않는다. 검증된 것만 일반화한다.

---

## Supabase 프로젝트

```
URL: grlfocvlfatuvphkyivd
스키마: public (corenull_ 접두사로 구분)
```

---

## 1. Unified Message 테이블

### messages (공통 핵심 테이블)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| type | text | post \| comment \| chat \| event \| fruit |
| room_id | uuid | 방 ID (FK → corenull_rooms) |
| user_id | uuid | CoreChat 사용자 ID (nullable) |
| owner_key | text | CoreNull device_id |
| content | text | 원문 내용 |
| language | text | 원문 언어 (ko/vi) |
| translation_status | text | pending \| completed \| failed |
| translated_ko | text | 한국어 번역 결과 |
| harvested_at | timestamptz | 수확 시점 (null = 미수확) |
| meta | jsonb | 미디어 등 부가정보 |
| relations | jsonb | parent_id 등 관계 정보 |
| created_at | timestamptz | 생성 시각 |

**인덱스:**
- `idx_messages_room_id`
- `idx_messages_type`
- `idx_messages_owner_key`
- `idx_messages_translation_pending` (partial: translation_status = 'pending')
- `idx_messages_harvested` (partial: harvested_at IS NOT NULL)

**⚠️ 정리 필요:**
- `message` 컬럼 (CoreChat이 content와 중복 저장 중) → 제거 대상
- `translated_vi` 컬럼 (CoreChat 전용) → 제거 또는 공통화 검토
- `nickname`, `device_id` 컬럼 (CoreChat 전용) → 제거 대상

---

## 2. CoreNull 테이블

### corenull_houses (집)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| name | text | 집 이름 |
| owner_key | text | 집주인 device_id |
| primary_language | text | 집 기본 언어 (ko/vi) |
| intro | text | 집 소개 |
| created_at | timestamptz | |

### corenull_rooms (방)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| house_id | uuid | FK → corenull_houses |
| room_name | text | 방 이름 |
| seed_mode | boolean | 씨앗방 여부 |
| bloom_date | date | 꽃 피는 날 |
| access_type | text | public \| invite \| family |
| created_at | timestamptz | |

### corenull_house_members (멤버)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| house_id | uuid | FK |
| owner_key | text | 멤버 device_id |
| role | text | owner \| member |

### corenull_footprints (발자취)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| room_id | uuid | FK |
| owner_key | text | |
| visited_at | timestamptz | |

### corenull_bookmarks (북마크)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| message_id | uuid | FK → messages |
| owner_key | text | |
| created_at | timestamptz | |

### corenull_invite_tokens (초대 링크)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| house_id | uuid | FK |
| token | text | 초대 코드 |
| expires_at | timestamptz | |

---

## 3. CoreRing 테이블

### tb_trans_logs (번역 캐시)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| original | text | 원문 |
| translated | text | 번역 결과 |
| source_lang | text | |
| target_lang | text | |
| created_at | timestamptz | |

### audio_contributions (발음 DB)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| word | text | 단어 |
| audio_url | text | Cloudinary URL |
| language | text | |
| contributor_key | text | |
| created_at | timestamptz | |

---

## 4. HajunAI 테이블

### contexts (맥락 주입용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| content | text | 맥락 내용 |
| project_id | text | 프로젝트 구분 |
| created_at | timestamptz | |

### hajunai_conversations (대화 스냅샷)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| ai_source | text | Claude \| ChatGPT \| Gemini |
| content | text | 대화 내용 |
| project_id | text | |
| created_at | timestamptz | |

---

## 5. 정리 대상 (삭제/마이그레이션 필요)

```
⚠️ messages.message 컬럼 → content와 중복, 제거 대상
⚠️ messages.nickname → CoreChat 전용, 제거 대상
⚠️ messages.device_id → owner_key와 중복 가능성, 확인 필요
⚠️ corenull_categories → 현재 사용 여부 확인 필요
⚠️ corenull_milestones → 현재 사용 여부 확인 필요
```

---

## 6. Unified Message 구조 진행 단계

```
Phase 1 (지금) → messages 중복 컬럼 분석 + 제거
Phase 2        → CoreChat API 공통 구조 적용
Phase 3        → CoreNull API 정리
Phase 4        → CoreRing 번역 구조 확립
Phase 5        → 운영 데이터 기반 재평가 (JSONB 도입 여부)
```

---

## 7. 확정된 원칙

```
- metadata(JSONB)는 현재 단계에서 적극 도입하지 않음
- 자주 조회/필터링되는 값은 일반 컬럼으로 유지
- is_harvested 컬럼 없음 → harvested_at IS NOT NULL로 판정 (Single Source of Truth)
- type='seed' 없음 → seed_mode는 Room 레벨 속성
- SEO 노출은 access_type='public' 데이터만
```