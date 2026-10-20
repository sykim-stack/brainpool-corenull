# CoreNull → CoreHub Message source revision / Auth UID / outbox 설계 v1

_상태: 설계 초안 — 운영 migration·DB write 미실행_
_기준일: 2026-10-20_
_소유자: CoreNull producer / CoreHub 수신 계약과 공동 검토 필요_
_관련: CoreHub `20261020_corenull_message_event_contract.md`_

## 1. 목적과 불변 원칙

CoreNull의 `messages` 원본을 보존하면서 CoreHub에 안정적인 `space.message.created` event를 전달한다.

이 문서는 구현·migration 실행 문서가 아니다. 현재 운영 DB에는 아무 변경도 적용하지 않는다.

고정 원칙:

- 기존 `owner_key`는 BRAINPOOL Owner ID로 보존한다.
- Google `provider_sub`나 Supabase Auth UID로 `owner_key`를 교체하지 않는다.
- Auth UID는 검증된 인증 주체로 사용하고, 기존 Owner 식별자와 별도로 저장한다.
- Message 원문(`content`)과 원본 row는 승인 없이 변경하지 않는다.
- Message write와 outbox event 생성은 같은 DB transaction 경계에 둔다.
- CoreHub 전송 실패는 Message write 실패로 되돌리지 않는다. 이미 commit된 outbox가 retry한다.
- CoreHub 승인·promotion은 이 outbox의 책임이 아니다. outbox는 원본 관찰 event를 전달할 뿐이다.

## 2. 현재 확인된 상태

### 2.1 `messages`

현재 generated type에서 확인한 핵심 필드:

```text
id
room_id
house_id
owner_key
user_id
device_id
type
content
meta
relations
language
translated_ko
translation_status
translations
harvested_at
created_at
```

현재 `messages`에는 다음이 없다.

- CoreHub ordering용 monotonic source revision
- 명시적인 `updated_at`
- 검증된 Supabase Auth UID와 Owner의 canonical mapping
- durable event outbox

### 2.2 현재 Google identity 흐름

현재 흐름은 다음과 같다.

```text
Google ID token
  → supabase.auth.signInWithIdToken()
  → Google provider_sub 추출
  → corenull_owner_identities(provider, provider_sub, owner_key)
  → 기존 또는 신규 owner_key 반환
```

이 흐름은 `owner_key` 보존에는 맞지만, CoreHub가 검증해야 하는 `auth.users.id`를 CoreNull Owner 계약으로 확정·조회하는 단계가 없다.

### 2.3 현재 전송 문제

`app/api/corenull/posts/route.js`와 `rooms/route.js`의 현재 `pushFact()`는 다음 특성을 가진다.

- Authorization 없음
- Idempotency-Key 없음
- `owner_key`를 request body에 넣음
- response/status 확인 없음
- fetch 실패 시 catch 후 event 소실
- Message write와 event write가 동일 transaction이 아님

이 경로는 CoreHub PR #2의 운영 수신 계약으로 사용하지 않는다.

## 3. 권장 ownership 모델

### 3.1 식별자 역할

| 식별자 | 의미 | 처리 원칙 |
|---|---|---|
| `auth_user_id` | Supabase `auth.users.id`, 검증된 로그인 주체 | JWT에서 서버가 확정 |
| `owner_key` | BRAINPOOL Owner ID, 기존 원본·House 연결 키 | 기존 값 보존, 자동 교체 금지 |
| `provider_sub` | Google/Kakao 등 provider별 외부 subject | 인증 alias, Owner ID로 사용 금지 |
| `device_id` | 장치 또는 legacy client 식별자 | 인증·소유권 assertion으로 사용 금지 |

### 3.2 새 canonical mapping 제안

기존 `corenull_owner_identities`를 깨지 않고 별도 mapping table을 둔다.

```sql
public.corenull_auth_owners
---------------------------
auth_user_id uuid primary key references auth.users(id)
owner_key    text not null
created_at   timestamptz not null default now()
updated_at   timestamptz not null default now()
```

권장 제약:

```text
UNIQUE(auth_user_id)
UNIQUE(owner_key)
```

단, 기존 데이터에 여러 legacy identity가 같은 `owner_key`를 가리킬 수 있으므로 `corenull_owner_identities.owner_key`에는 unique를 추가하지 않는다.

`corenull_auth_owners`의 `owner_key` unique 여부는 실제 legacy 중복 현황을 읽기 전용으로 조사한 뒤 확정한다. 중복이 있으면 먼저 canonical Owner merge 절차를 승인해야 하며, 임의 backfill하지 않는다.

### 3.3 Auth mapping write 규칙

1. 서버가 Supabase Auth token으로 `auth.getUser(token)`을 호출한다.
2. 반환된 `user.id`만 `auth_user_id`로 사용한다.
3. 요청 body의 `auth_user_id`, `owner_key`, `device_id`를 인증 결과로 신뢰하지 않는다.
4. 기존 `auth_user_id` mapping이 다른 `owner_key`를 가리키면 `409 IDENTITY_CONFLICT`로 중단한다.
5. 기존 `owner_key`가 다른 `auth_user_id`에 연결되어 있으면 merge 승인 없이는 연결하지 않는다.
6. Google provider mapping은 alias로 유지하되 Auth UID mapping과 함께 transaction으로 갱신한다.
7. legacy `owner_key`만 가진 session은 Message event producer를 활성화하지 않고 legacy read/write compatibility만 유지한다.

## 4. Source revision 설계

### 4.1 권장 방식

`messages` row에 source revision metadata를 추가하는 방식을 권장한다.

```text
source_revision bigint not null default 1
updated_at      timestamptz not null default now()
```

의미:

- insert: `source_revision = 1`
- 동일 Message의 의미 있는 update: revision을 정확히 1 증가
- no-op update: update 정책에 따라 revision 증가 여부를 하나로 고정
- delete/archive/harvest 상태 변경: 별도 event를 도입할 때 revision 증가
- `created_at`은 revision으로 사용하지 않음
- `updated_at`만으로 ordering/idempotency를 구현하지 않음

### 4.2 변경 경계

현재 `messages` 변경 경로는 posts API의 `edit`, `delete`, `archive`, `rebirth`, `harvest`로 나뉜다.

Stage A에서는 `space.message.created`만 전송한다. 다음 event는 source revision transaction이 검증된 뒤 추가한다.

```text
space.message.updated
space.message.archived
space.message.deleted
space.message.harvested
```

`delete`는 실제 row 삭제가 아니라 현재처럼 `meta.deleted=true` tombstone을 유지하는 방향을 우선한다. 원본 보존 원칙상 hard delete event는 별도 승인 없이는 사용하지 않는다.

### 4.3 Revision을 trigger만으로 처리하지 않는 이유

DB trigger는 revision 증가를 보장할 수 있지만, 현재 write path와 actor/Auth context가 service-role route를 거친다. 따라서 trigger만 추가하면 다음을 해결하지 못한다.

- verified Auth UID 확정
- legacy owner와 Auth owner 충돌
- event payload에 actor scope 포함
- outbox event type 선택
- transaction별 canonical payload 생성

최종 구현은 **검증된 server-side RPC 또는 동등한 transaction 함수**를 통해 Message write와 outbox 생성, revision 확정을 함께 처리한다.

## 5. Durable outbox 논리 schema

아래는 migration 초안이 아니라 논리 계약이다.

```text
corenull_message_outbox
-----------------------
id uuid primary key default gen_random_uuid()
event_id text not null unique
source text not null default 'CoreNull'
event_type text not null
source_record_id uuid not null
source_revision bigint not null
auth_user_id uuid null
owner_key text null
house_id uuid null
room_id uuid null
payload jsonb not null
payload_sha256 text not null
status text not null default 'pending'
attempt_count integer not null default 0
available_at timestamptz not null default now()
lease_token uuid null
lease_until timestamptz null
last_http_status integer null
last_error_code text null
last_error_message text null
sent_at timestamptz null
quarantined_at timestamptz null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

권장 status:

```text
pending
processing
retry_wait
sent
quarantined
```

필수 제약:

```text
UNIQUE(event_id)
UNIQUE(source_record_id, source_revision, event_type)
CHECK(attempt_count >= 0)
```

`payload`에는 원본 보존에 필요한 Message snapshot만 저장한다. token, service key, SQL, 승인 상태, 임의 command는 저장하지 않는다.

### 5.1 Event envelope

```json
{
  "source": "CoreNull",
  "event_type": "space.message.created",
  "event_id": "corenull:messages:<message_id>:v<source_revision>",
  "source_record_id": "<messages.id>",
  "source_revision": 1,
  "occurred_at": "<transaction-time>",
  "owner_id": "<verified-auth.users.id>",
  "house_id": "<messages.house_id>",
  "room_id": "<messages.room_id>",
  "payload": {
    "message_id": "<messages.id>",
    "house_id": "<messages.house_id>",
    "room_id": "<messages.room_id>",
    "type": "post",
    "content": "<original>",
    "meta": {},
    "relations": {},
    "language": "ko",
    "translated_ko": null,
    "translation_status": "completed",
    "harvested_at": null,
    "created_at": "<messages.created_at>"
  },
  "payload_sha256": "<canonical-json-sha256>"
}
```

`owner_id`는 CoreHub 계약 이름이며, CoreNull 내부 mapping source는 verified `auth_user_id`다.

`payload_sha256`은 **payload 객체만**의 canonical JSON UTF-8 바이트에 대한 SHA-256이다. 송신자와 수신자는 동일한 canonicalization 규칙을 사용해야 한다(권장: RFC 8785 JCS). 수신자는 전달된 hash를 신뢰하지 않고 payload를 독립적으로 canonicalize해 재계산한다. 양쪽 구현은 공통 test vector로 검증한다. Hash는 무결성 불일치 탐지용이며 producer 인증이나 서명을 대체하지 않는다.

## 6. Transaction write 설계

### 6.1 신규 Message

권장 흐름:

```text
HTTP request
  → Bearer token 검증
  → auth_user_id 확정
  → auth_user_id ↔ owner_key mapping 조회
  → room/house ownership 검증
  → transaction function:
       1. messages insert, source_revision=1
       2. canonical payload 생성
       3. outbox insert, event_id unique
       4. commit
  → 201 response
```

CoreHub fetch는 commit 후 worker가 수행한다. HTTP request에서 직접 CoreHub fetch를 await하지 않는다.

### 6.2 Message update

```text
HTTP request
  → Bearer token 검증
  → 현재 Message 및 owner scope 조회
  → transaction function:
       1. expected source_revision 확인
       2. messages update, source_revision + 1
       3. outbox insert for approved event type
       4. commit
  → response
```

`expected_revision`이 맞지 않으면 `409 MESSAGE_REVISION_CONFLICT`로 중단한다. last-write-wins로 조용히 덮어쓰지 않는다.

### 6.3 Legacy write

Auth 없는 legacy `owner_key` write는 기존 기능 호환을 위해 당장 제거하지 않는다. 단, 다음을 명확히 구분한다.

```text
legacy owner_key write  → CoreNull 기능 호환
verified Auth write     → CoreHub event producer 가능
```

legacy write에서 생성된 Message는 Auth UID가 확인되지 않으므로 CoreHub event를 자동 생성하지 않는다. legacy data backfill은 별도 mapping 승인과 staging 검증 없이는 실행하지 않는다.

## 7. Worker lease와 retry

worker는 outbox row를 다음 순서로 처리한다.

1. `status in ('pending','retry_wait')`이고 `available_at <= now()`인 row를 claim한다.
2. claim 시 `status='processing'`, `lease_token=random_uuid()`, `lease_until=now()+lease_duration`, `attempt_count+1`을 원자적으로 기록한다.
3. claim된 payload와 event_id를 그대로 CoreHub에 전송한다.
4. CoreHub가 계약한 `201 Created`(신규 저장) 또는 `200 OK`(동일 이벤트의 정확한 중복)만 `sent`로 finalize한다.
5. `401/403/409/422`는 자동 무한 retry하지 않고 `quarantined`로 전환한다. `409`는 idempotency/identity conflict, `422`는 hash/schema/revision contract 위반이다.
6. `408/429/5xx/network`는 backoff 후 `retry_wait`로 전환한다.
7. finalize 조건에 `id`와 현재 `lease_token`을 모두 포함한다.
8. lease가 만료된 worker의 늦은 응답은 update row count 0으로 처리한다.
9. worker는 outbox payload나 로그에 access token을 남기지 않는다.

권장 backoff 예:

```text
attempt 1: 30초
attempt 2: 2분
attempt 3: 10분
attempt 4: 1시간
attempt 5 이후: 운영 정책에 따른 quarantine 또는 수동 재시도
```

정확한 시간은 staging에서 조정한다. 재시도 때 event_id, source_revision, payload hash는 바꾸지 않는다.

## 8. RLS·credential 경계

- client는 outbox를 직접 select/insert/update/delete하지 못한다.
- Message API도 client가 `auth_user_id`를 지정하지 못하게 한다.
- Auth 검증과 owner mapping은 server-side only다.
- worker만 outbox claim/finalize 권한을 가진다.
- CoreHub service credential은 CoreNull DB나 outbox payload에 저장하지 않는다.
- CoreHub endpoint URL과 credential은 worker 환경변수로만 주입한다.
- worker 로그는 content 전체를 출력하지 않고 event_id, source_record_id, status, trace_id만 기록한다.

## 9. Staging 검증 시나리오

### Identity

- [ ] verified Auth UID가 mapping된 owner_key와 일치하면 통과
- [ ] body의 다른 owner_key는 무시하거나 conflict
- [ ] Auth UID mapping 없음은 event producer 차단
- [ ] Auth UID가 다른 owner_key에 매핑되면 `IDENTITY_CONFLICT`
- [ ] legacy owner_key-only write는 기존 기능만 수행하고 outbox를 만들지 않음

### Revision

- [ ] 신규 Message는 revision 1
- [ ] expected revision 1 update는 revision 2
- [ ] stale expected revision update는 409
- [ ] duplicate event는 하나의 outbox identity만 생성
- [ ] `space.message.created`의 `source_revision != 1`은 CoreHub가 `422 REVISION_UNEXPECTED`로 거부하고 outbox가 quarantine 처리
- [ ] revision 2 event는 Stage A에서 전송하지 않음; 향후 update event는 별도 계약 승인 후 추가

### Outbox

- [ ] Message insert 성공 + outbox insert 성공만 commit
- [ ] outbox insert 실패 시 Message와 함께 rollback
- [ ] CoreHub 503은 retry_wait
- [ ] CoreHub 409 conflict는 quarantine
- [ ] lease expiry 후 stale worker finalize는 no-op
- [ ] 같은 payload retry는 동일 canonicalization 규칙으로 같은 hash 유지
- [ ] CoreHub 422는 retry가 아니라 quarantine으로 분류
- [ ] 원본 Message content는 producer/worker 과정에서 변경되지 않음

### Scope

- [ ] 다른 owner의 Message를 현재 Auth UID로 전송할 수 없음
- [ ] 다른 house의 Message를 room 경로만으로 전송할 수 없음
- [ ] house ownership은 `corenull_houses.owner_key`와 verified owner mapping을 함께 확인
- [ ] member 권한과 owner 권한을 CoreHub event ownership으로 혼동하지 않음

## 10. 구현 순서

1. 현재 production DB와 code에 아무 write도 하지 않고 legacy identity row 중복·Auth 연결 상태를 read-only 조사한다.
2. `corenull_auth_owners` mapping contract를 별도 문서와 staging SQL 초안으로 제안한다.
3. Message `source_revision`/`updated_at` 변경을 staging migration 초안으로 제안한다.
4. outbox 논리 schema와 claim/finalize RPC 초안을 작성한다.
5. Message create route를 바로 바꾸지 않고 transaction function pure contract를 테스트한다.
6. disposable staging에서 identity·revision·outbox·lease 테스트를 실행한다.
7. CoreHub staging receiver와 producer E2E를 실행한다.
8. 결과와 rollback 절차를 승인받은 뒤에만 운영 migration을 별도로 검토한다.

## 11. 운영 적용 차단 조건

다음 조건 전에는 CoreNull 실데이터의 CoreHub 전송을 활성화하지 않는다.

- [ ] `auth_user_id` ↔ `owner_key` mapping의 canonical source 승인
- [ ] legacy Owner 중복·미연결 상태 read-only inventory 완료
- [ ] source revision semantics 승인
- [ ] Message/outbox atomic transaction 검증
- [ ] worker retry·quarantine·lease 검증
- [ ] CoreHub authentication ADR 승인
- [ ] CoreNull과 CoreHub 모두 disposable staging ref에서 E2E 통과
- [ ] 기존 `pushFact()` 제거 또는 명시적으로 disabled 처리
- [ ] 운영 rollback과 quarantine replay 절차 승인
- [ ] 기존 원본 Message의 payload·row count 불변 확인

현재 이 문서는 설계 제안이며, 운영 DB·staging DB 모두에 migration이나 write를 실행하지 않았다.

### 11.1 CoreHub receiver의 idempotency 응답과 일치 조건

- `201 Created`: 신규 event가 durable하게 저장된 경우에만 반환한다.
- `200 OK`: 기존 `event_id`의 모든 immutable field가 기존 row와 정확히 일치하는 재전송에만 반환한다.
- `409 EVENT_IDEMPOTENCY_CONFLICT`: 같은 `event_id`인데 `source`, `event_type`, `source_record_id`, `source_revision`, normalized `occurred_at`, `owner_id`, `house_id`, `room_id`, canonical payload 또는 `payload_sha256` 중 하나라도 다르다.
- `409 EVENT_IDENTITY_CONFLICT`: 다른 `event_id`가 이미 존재하는 `(source, source_record_id, source_revision, event_type)`를 재사용한다.
- `422 PAYLOAD_HASH_MISMATCH`: 수신 측 재계산 hash와 전달 hash가 다르다.
- `422 REVISION_UNEXPECTED`: Stage A `space.message.created`의 revision이 1이 아니다.

동일 `event_id`와 동일 hash만으로 duplicate를 판정하지 않는다. DB unique constraint와 atomic insert/conflict-reload가 멱등성의 최종 경계다.
