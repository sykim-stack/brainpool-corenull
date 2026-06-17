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
🍎 Fruit   = Message(type="fruit")               → 경험이 콘텐츠가 됨
📚 Library = 수확된 열매 아카이브 (서재)           → 삶의 경험 보관소
📦 Storage = External System (Section 12)        → 열매와 무관한 독립 시스템
```

Access type mapping:

```
public  → 마당 노출 → 수확 시 서재
invite  → 거실 노출 → 수확 시 서재
family  → 방 노출   → 수확 시 서재
```

Fruit rules:
* Fruit is created after Flower
* Owner decides public/private
* 수확(harvest) 시 서재(Library)로 이동
* Fruit와 Storage는 연결 없음 (보상 심리 차단)

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

## FINAL RULE

👉 BRAINPOOL is NOT a collection of features.

👉 It is a system that interprets and displays Messages.

👉 HajunAI is the Mind Layer — 사용자의 삶의 흐름을 잊지 않는 AI.

Breaking this rule is considered a critical failure.