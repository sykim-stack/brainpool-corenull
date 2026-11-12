# CoreNull Outbox Stage A — 신뢰성 경계 잠금

_기준일: 2026-11-12_  
_관련 PR: brainpool-corenull #32_  
_상위 설계: `doc/CORENULL_COREHUB_MESSAGE_OUTBOX_DESIGN_v1.md`_

## 1. 한 줄 정의

> **Outbox 신뢰성 = 원본 이벤트가 한 번 기록되면, CoreHub에 결국 한 번만 반영된다.**

- **At-least-once 전달**: outbox 적재 + flush 재시도
- **Exactly-once 효과**: `idempotency_key` / CoreHub facts 동일 키 조회
- **사용자 경로 비차단**: CoreHub·enqueue 실패 ≠ rooms/seed HTTP 실패

## 2. Stage A 범위 (현재 구현)

| 이벤트 | 생산 경로 | 전송 |
|--------|-----------|------|
| `space.message.created` | posts / message write → outbox | flush |
| `space.seed.created` | rooms POST(seed_mode) · `startSeedRun` → `enqueueFact` | flush |
| `space.fruit.created` | `finalizeSeedIfDue` → `enqueueFact` | flush |

직행 `pushFact` (rooms) 는 제거한다. 전송 경로는 **`corenull_message_outbox` 하나**다.

### 2.1 테이블·워커 (운영 실체)

설계 v1의 lease/quarantine 스키마보다 **얇은 실테이블**을 쓴다.

```text
corenull_message_outbox
  id, status (pending|sent|failed)
  attempts, next_attempt_at, sent_at, last_error
  fact_type, owner_key, message_id, idempotency_key, payload, created_at
```

Flush: `GET|POST /api/corenull/outbox/flush`

- BATCH 20
- MAX_ATTEMPTS 8
- 지수 백오프 (상한 30분)
- 4xx(408/429 제외) 또는 한도 초과 → `failed`
- CoreHub POST + `Idempotency-Key` 헤더

### 2.2 Stage A에서 보장하는 것

| 보장 | 방법 |
|------|------|
| 실패 시 이벤트 소실 방지 | outbox 적재 후 재시도 |
| 이중 flush / 재전송 | idempotency_key + CoreHub 조회 |
| Core 쓰기 응답 보호 | enqueue 실패 시 로그만, HTTP 성공 유지 |
| 관측 | status / attempts / last_error, `?stats=1` |

### 2.3 Stage A에서 보장하지 않는 것

| 비보장 | 이유 / 후속 |
|--------|-------------|
| claim / lease / finalize | 동시 워커 경합 시 중복 claim 가능. Hobby·저빈도 flush에서는 실위험 낮음 → 설계 Phase 2 |
| Message·outbox 완전 동일 트랜잭션 | seed/fruit는 insert 직후 enqueue. 설계 §6 RPC는 미착수 |
| Auth UID canonical producer | 설계 §3 mapping 승인 전. 현 producer는 `owner_key` 기준 |
| quarantine / 영구실패 자동 복구 | `failed` 후 수동 재큐·알림 없음 |
| source_revision 기반 event_id | Stage A는 idempotency_key 문자열 계약 |

## 3. 신뢰성 판정 기준 (수동 검증)

PR #32 머지·배포 후:

1. 씨드 시작 → outbox에 `space.seed.created`, `status=pending`
2. 열매 확정 → `space.fruit.created` pending
3. flush 호출 → 해당 row `sent`, CoreHub `facts`에 동일 type·owner 존재
4. flush 재실행 → CoreHub idempotent hit (중복 fact 없음)
5. rooms/seed-pages HTTP는 enqueue 실패와 무관하게 2xx 유지

## 4. 설계 v1과의 관계

| 설계 v1 | Stage A |
|---------|---------|
| lease_token / processing / quarantine | 미구현 (pending/sent/failed만) |
| Message write + outbox 동일 transaction function | 미구현 |
| auth_user_id → owner_key mapping | 미구현 |
| source_revision | 미구현 |
| seed/fruit Fact 경로 | **#32에서 message와 동일 outbox로 편입** |

Stage A는 설계의 **전송 유실 제거 + 경로 단일화** 구간이다.  
claim/finalize·atomic write·Auth producer는 설계 문서 구현 순서를 따른다. 급하지 않다.

## 5. 다음 선택 작업 (우선순위)

1. **검증** — §3 체크리스트 (코드 변경 없음)
2. **과거 중복 Fact 정리** — idempotency 이전 이중 적재 조사 (자동 삭제 금지)
3. **동일 트랜잭션 강화** — seed/fruit 생성과 outbox insert를 가능한 한 같은 DB 경계로
4. **claim/finalize RPC** — 설계 §7, 스케일·다중 워커 대비

## 6. 잠금 문장

- Stage A 전송 경로 = outbox only. 직행 CoreHub fetch 금지.
- CoreHub 실패는 CoreNull 사용자 쓰기를 롤백하지 않는다.
- Exactly-once는 CoreHub 수신 idempotency에 의존한다. producer는 at-least-once다.
- Phase 2(claim·atomic·Auth) 전까지 §2.3 비보장을 전제로 운영한다.
