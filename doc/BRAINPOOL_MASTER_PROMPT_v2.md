# BRAINPOOL SYSTEM MASTER PROMPT v2.0

## 1. CORE PRINCIPLE

All features must be built on a single unified data structure.

The system MUST NOT create separate structures for similar concepts.

---

## 2. CORE UNIT (ABSOLUTE RULE)

The entire system is based on ONE core unit:

👉 Message

Definition:

```
Message = {
  id,
  type,        // post | comment | chat | event | fruit
  content,
  meta,
  relations,
  created_at
}
```

---

## 3. SYSTEM ROLES (STRICT SEPARATION)

Each service has ONLY one responsibility:

* CoreNull  → View Layer            (displays Messages)
* CoreChat  → Flow Layer            (transfers Messages)
* CoreRing  → Interpretation Layer  (translates/analyzes Messages)
* HajunAI   → Mind Layer            (remembers and connects life context)

DO NOT mix responsibilities.

---

## 4. STRUCTURE RULES (MANDATORY)

* There must be ONLY ONE Message structure.
* Post, Comment, Chat, Event, Fruit are NOT separate systems.
* They are ALL Message with different types.

Examples:

* Post    = Message(type="post")
* Comment = Message(type="comment", relation: parent_post)
* Event   = Message(type="event", meta included)
* Fruit   = Message(type="fruit", meta.is_public)

---

## 5. FORBIDDEN ACTIONS (CRITICAL)

The system MUST NOT:

* Create separate Event system
* Create separate Comment system
* Create separate Fruit system
* Duplicate logic for similar behavior
* Place business logic in container layers (e.g., House)

---

## 6. RESPONSIBILITY MODEL

* Container (House) → layout + routing ONLY
* Message → ALL behaviors (create, update, delete, react)
* View → rendering ONLY (no business logic)

---

## 7. DESIGN PRINCIPLE

All user actions MUST originate from Message.

If a feature can exist WITHOUT Message, it is WRONG and must be rejected.

---

## 8. VIEW SYSTEM

Plaza / Yard / Living / Library / Room are NOT separate systems.

They are ONLY different views of Message.

```
마당 (Yard)    = 공개 씨앗/열매 피드 (public)
거실 (Living)  = 이웃공개 씨앗/열매 (invite)
방 (Room)      = 비공개 씨앗/열매 (family, 초대한 사람만)
서재 (Library) = 수확된 열매 아카이브 (모든 access_type 수확물)
```

Fruit 수확 흐름:

```
공개 씨앗   → 마당에서 성장/열매 → 수확 시 → 서재
이웃공개    → 거실에서 성장/열매 → 수확 시 → 서재
비공개      → 방에서 성장/열매   → 수확 시 → 서재
```

서재 = 삶의 경험 아카이브. 열매와 창고는 무관.

---

## 9. EXTERNAL CONTENT RULE

External pages (e.g., special events) MUST NOT be embedded as systems.

They can ONLY be referenced:

```
Message(type="link", meta.url="external_page")
```

---

## 10. VALIDATION CHECK (MANDATORY BEFORE OUTPUT)

Before generating code, ALWAYS verify:

1. Can this feature exist without Message?
   → If YES → REJECT

2. Is there duplicate logic?
   → If YES → REFACTOR

3. Is any logic placed in container (House)?
   → If YES → MOVE to Message

---

## 11. OUTPUT REQUIREMENT

* Always follow the structure above
* Never introduce new data models without approval
* Prefer simplification over expansion

---

## 12. EXTERNAL SYSTEM EXCEPTION

Storage(창고) is the ONLY external system exception.

* Storage exists OUTSIDE the Message system
* 열매/씨앗과 완전 무관 (보상 시스템 아님)
* 집주인 활동 분석 + 집 상태 점검 기반
* 시스템이 랜덤 생성 → 주인도 모르게 채워짐
* Separate commerce engine + payment system
* Separate layout from CoreNull

If a feature requires this exception, it must be explicitly approved.

---

## 13. SEED SYSTEM (CoreNull World Layer)

Seed System is a meaning layer only.
DB and API changes are minimal — meaning is the entire value.

```
🌱 Seed    = Room(seed_mode=true, bloom_date)    → 스스로에게 한 약속
🌿 Growth  = Message(type="post")                → 씨앗방 안의 모든 기록
🌸 Flower  = Room.bloom_date 도달 (auto-trigger) → 씨앗이 현실이 된 순간
🍎 Fruit   = Message(type="fruit")               → 주인이 직접 생성 (수동, 꽃→열매 진화)
📚 Library = 수확된 열매 아카이브 (서재)           → 삶의 경험 보관소
📦 Storage = External System (Section 12)        → 열매와 무관한 독립 시스템
```

Access type mapping:

```
public  → 마당 노출
invite  → 거실 노출
family  → 방 노출
```

Fruit rules (모두 주인의 수동 결정 — 자동화 없음):
* Flower 도달은 자동(bloom_date) — Fruit 생성은 수동(주인이 결정)
* Fruit 생성 후에도 원래 공간(마당/거실/방)에 그대로 머무를 수 있음 — "미수확" 상태도 정상
* 수확(harvest) 여부와 시점도 주인이 결정 — Fruit ≠ 자동으로 Library 이동
* 수확 시에만 Library(서재)로 이동
* Fruit와 Storage는 연결 없음 (보상 심리 차단)

Schema 필요 필드 (messages, type='fruit'):
```
is_harvested   boolean   → 서재로 옮겼는지 여부
harvested_at   timestamp → 옮긴 시점 (nullable)
```

### 13-1. Fruit/Harvest 보완 사항 (2026-06-18 추가)

**Single Source of Truth 원칙 적용:**

`is_harvested`와 `harvested_at`을 둘 다 두면 모순 상태가 가능함
(예: `is_harvested=false`인데 `harvested_at`에 값이 있는 경우).
BRAINPOOL 원칙(중복 제거, 단일 진실)에 따라 **`harvested_at` 하나만 사용**한다.

```
harvested_at timestamptz null

판정: harvested_at IS NOT NULL → 수확됨
```

`is_harvested` 컬럼은 생성하지 않는다.

**Fruit/Harvest/Library 관계 명시:**

```
Fruit는 원본 Message를 이동시키지 않는다.
Harvest는 Fruit Message를 삭제하거나 이동하는 행위가 아니다.
Library는 harvested_at IS NOT NULL 인 Fruit를 보여주는 View이다.
```

즉 "수확 = Fruit를 Library로 move"가 아니라, Fruit는 원래 위치(마당/거실/방)에 그대로 존재하고
Library는 단지 그중 수확된 것만 필터링해 보여주는 View일 뿐이다.

DB changes (already applied):
```
corenull_rooms
  event_mode  → seed_mode   ✅
  bloom_date               ✅
  room_type 'event' → 'seed' ✅

messages
  type ENUM → 'fruit' 추가 필요
```

---

## 14. HAJUNAI ROLE (Mind Layer)

HajunAI는 Q&A AI가 아니다.
HajunAI는 사용자의 삶의 흐름을 잊지 않는 AI다.

```
질문 답변 AI        ❌
삶의 흐름 비서 AI   ⭕
```

핵심 역할:
* 씨앗 생애주기 관리   → bloom_date 추적, 임박 알림
* 삶의 흐름 추적      → 활동 패턴 분석
* 관계 성장 추적      → 이웃 방문 / 대화 빈도
* 모듈 간 맥락 중재   → CoreNull / CoreChat / CoreRing 연결
* MindWorld 연동     → 기억 연결, 반복 패턴 감지

HajunAI reads Messages — it does NOT create or modify them.

---

## 15. SEO SOURCE RULE

검색엔진 노출 및 메타데이터 생성은 `access_type='public'` 데이터만 사용 가능하다.

```
public  → SEO 대상 ✅
invite  → SEO 대상 ❌ (village/거실급)
family  → SEO 대상 ❌
```

`public`이 아닌 모든 데이터는 다음 SEO 계층 전체에서 제외한다:

```
- 검색엔진 색인 (indexing / sitemap 포함)
- 키워드 추출
- 메타 description 자동 생성
- 추천/연관 콘텐츠 생성
```

구현 원칙:
* House/Room/Post 메타태그 생성 로직은 반드시 `access_type` 체크를 선행한다
* `invite`/`family` 페이지는 `noindex` 처리 + 사이트맵에서 제외
* HajunAI가 향후 키워드 자동 추출(Section 14 확장)을 수행하더라도, 이 규칙을 우회할 수 없다
* 이 규칙 위반(비공개 데이터의 SEO 노출)은 Section 5의 FORBIDDEN ACTIONS와 동급의 critical failure로 취급한다

---

## 16. KAKAO IN-APP BROWSER COMPATIBILITY (공통 규칙)

카카오톡 인앱 브라우저를 통한 링크 공유는 BRAINPOOL의 주요 신규 사용자 유입 경로다.
네트워크 초기 단계에서는 신규 사용자 한 명의 진입이 안정성보다 우선하는 가치다.

카카오 인앱 브라우저는 일부 Web API를 지원하지 않으며,
가드 없이 호출 시 throw → 페이지 전체가 죽는 현상이 발생한다 (CoreRing에서 실증/해결됨).

```
알려진 미지원/제한 API:
- Notification.requestPermission()  → 호출 시 throw 가능 (CRITICAL, 절대 가드 없이 호출 금지)
- Web Push                          → 미지원
- MediaRecorder (webm)              → 미지원/제한
```

**필수 가드 패턴**:
```javascript
if (typeof Notification !== 'undefined' && Notification.requestPermission) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') subscribePush(deviceId);
  }).catch(() => {});
}
```

Service Worker 등록은 카카오 인앱에서 스킵할 필요 없음 — 위 Notification 가드만
되어 있으면 정상 등록 가능 (CoreRing에서 검증 완료, 별도 스킵 조건 불필요).

**공유 우선순위** (검증 결과 기준):
```
1순위 — 링크 공유 (navigator.share) → 주인공, 사용자에게 가장 익숙한 행위
2순위 — 코드/식별자 복사 → 안전장치
3순위 — 카카오 인앱 감지 시 수동 안내 텍스트
         "우측 메뉴 → 다른 브라우저로 열기"
```

```
❌ 금지: JavaScript 자동 탈출 시도 (kakaotalk://, intent:// 등)
   → 검증 결과 신뢰할 수 없음. 안내 텍스트로 대체한다.
```

**공유 UI 구성 (ShareModal 공통 패턴)**:
```
[공유하기] ← 메인 버튼 (navigator.share)
[코드 복사] ← 서브 버튼
카카오 UA 감지 시 → 안내 텍스트 노출
```

**적용 범위**:
```
CoreRing → 채팅방 초대 (ShareRoomModal)
CoreNull → 씨앗방/마당/거실 공유 (House/Room 공유 기능 구현 시 동일 패턴)
향후 모든 BRAINPOOL 모듈 공유 진입점
```

---

## FINAL RULE

👉 BRAINPOOL is NOT a collection of features.

👉 It is a system that interprets and displays Messages.

👉 HajunAI is the Mind Layer — 사용자의 삶의 흐름을 잊지 않는 AI.

Breaking this rule is considered a critical failure.