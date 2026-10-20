# CoreNull Message Outbox — Contract Test Plan

- Status: test specification only; no source implementation or test execution is claimed
- Date: 2026-10-20
- Scope: verified Auth Message creation → atomic outbox → retry worker
- Related: `CORENULL_COREHUB_MESSAGE_OUTBOX_DESIGN_v1.md`

## 1. Safety boundary

This plan does not authorize a production migration, production database write, live CoreHub delivery, legacy identity backfill, or modification of existing Message content.

Stage A is limited to `space.message.created` for a Message created through a verified Auth path. Existing legacy `owner_key`-only writes remain compatible but must not create a verified CoreHub outbox event. Existing `pushFact()` delivery must not overlap with the new worker; a transition/disable plan is required before any real delivery is enabled.

## 2. Identity and authorization tests

| ID | Scenario | Expected result |
|---|---|---|
| CN-01 | Valid Auth token resolves to an existing approved `auth_user_id ↔ owner_key` mapping | Message write may proceed within verified house/room scope |
| CN-02 | Missing/invalid Auth token | Reject verified producer path; no outbox row |
| CN-03 | Request body supplies a different `auth_user_id` | Ignore as authority; use server-verified UID only |
| CN-04 | Body `owner_key` conflicts with verified mapping | Reject with documented identity conflict; no outbox row |
| CN-05 | Auth UID has no approved mapping | Do not guess or auto-create a mapping; no CoreHub outbox event |
| CN-06 | Existing owner_key maps to a different Auth UID | Stop with `IDENTITY_CONFLICT`; no automatic merge |
| CN-07 | Legacy owner_key-only Message write | Preserve existing compatibility; no verified outbox event |
| CN-08 | User can access room but does not have owner permission required by event contract | Do not assert owner identity or emit event |
| CN-09 | House/room belongs to a different owner scope | Reject; no Message/outbox side effect |

## 3. Message + outbox atomicity

| ID | Scenario | Expected result |
|---|---|---|
| CN-10 | Verified create succeeds and outbox insert succeeds | Message and outbox commit together; revision is 1 |
| CN-11 | Outbox insert fails after tentative Message insert | Entire transaction rolls back; neither row persists |
| CN-12 | Message insert fails | No outbox row persists |
| CN-13 | Client retries after successful commit but lost HTTP response | Must not create a second logical Message/event; define and test request-level retry behavior before enabling |
| CN-14 | Client submits invalid content or scope | No outbox event |
| CN-15 | Message content is read back after event creation | Original content and Message row remain unchanged |

The transaction boundary must be implemented by a server-side RPC or equivalent transaction function. A route that separately writes Message and then inserts an outbox row does not satisfy this contract.

## 4. Revision and event identity

- New Message: `source_revision = 1`.
- Event ID: `corenull:messages:<message_id>:v<source_revision>`.
- Stage A emits only `space.message.created` with revision 1.
- Update/archive/delete/harvest events are out of scope until separately approved.
- A retry must preserve the original event ID, revision, payload, and payload hash.

| ID | Scenario | Expected result |
|---|---|---|
| CN-16 | New verified Message | Revision 1 and deterministic event ID |
| CN-17 | Retry of same outbox row | Same event ID/revision/hash |
| CN-18 | Attempt to emit created event with revision other than 1 | Prevent emission or quarantine as contract violation |
| CN-19 | Same source identity attempted twice | Database unique constraint prevents a second logical outbox event |
| CN-20 | Existing legacy Message has no verified Auth mapping | No automatic backfill or event creation |

## 5. Canonical payload hash

`payload_sha256` is SHA-256 of the UTF-8 bytes of the canonical JSON serialization of the `payload` object only. Recommended canonicalization is RFC 8785 JCS, pending agreement with CoreHub.

Required checks:
- key order differences produce the same canonical representation;
- changed content or other payload value changes the hash when canonical bytes change;
- producer-generated hashes match CoreHub's shared test vectors;
- retry does not regenerate a different payload/hash from mutable live Message state;
- hash is not treated as authentication.

The outbox must persist an immutable payload snapshot at the same transaction boundary as the Message write. A retry sends that snapshot, not a newly reconstructed payload.

## 6. Worker lease, retry, and quarantine

| ID | Scenario | Expected result |
|---|---|---|
| CN-21 | Worker claims eligible pending row | Atomic claim sets processing, increments attempt count, and issues a new lease token |
| CN-22 | Two workers claim concurrently | One valid lease owner per row |
| CN-23 | Receiver returns 201 | Mark sent only if the lease token still matches |
| CN-24 | Receiver returns 200 exact duplicate | Mark sent only if the lease token still matches |
| CN-25 | Receiver returns 401 or 403 | Quarantine; do not retry forever |
| CN-26 | Receiver returns 409 or 422 | Quarantine and preserve error code for operator review |
| CN-27 | Receiver returns 408, 429, 5xx, or network error | Retry with backoff; preserve event ID/revision/payload/hash |
| CN-28 | Lease expires and old worker returns late | Old lease token cannot finalize row |
| CN-29 | Receiver committed event but response was lost | Retry exact event; receiver returns 200 duplicate; one receiver row |
| CN-30 | Worker crashes after claim | Expired lease can be reclaimed according to documented policy |
| CN-31 | Secret missing from worker environment | Fail closed; no unauthenticated send |
| CN-32 | Logging on any path | No bearer secret/token or full message content in ordinary logs |

## 7. Cross-system end-to-end checks

On disposable staging only:

1. Create one test Message through the verified Auth path.
2. Verify one Message row and one outbox row committed atomically.
3. Run the worker and verify the receiver stores one event.
4. Replay the exact same event and verify receiver row count does not increase.
5. Simulate response loss after receiver commit and verify retry resolves as duplicate.
6. Force receiver 503 and verify retry_wait/backoff without Message rollback.
7. Force 409/422 and verify quarantine with retained diagnostic code.
8. Verify no Facts, Connection, Meaning, Opportunity, approval, or promotion side effects in Stage A.
9. Verify existing legacy writes and existing `pushFact()` behavior are not silently altered by the documentation-only PR.

## 8. Exit criteria

- [ ] Identity mapping ownership and conflict behavior are approved.
- [ ] Message/outbox atomicity is proven with rollback tests.
- [ ] Lease claim/finalize is atomic and stale worker finalization is a no-op.
- [ ] CoreNull and CoreHub canonicalization test vectors match.
- [ ] All worker response classes match the receiver status contract.
- [ ] Existing legacy path coexistence or disablement is explicitly planned.
- [ ] Disposable-staging E2E passes and records commit SHAs.
- [ ] No production migration, backfill, or event delivery is enabled before human approval.
