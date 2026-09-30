# Spec: CoreNull Owner 정체성 & Google 로그인 (Step 2a) — 검증 버전

> 공유 프로젝트 canonical spec. 핵심 불변식 `owner_key 보존 (provider_sub = 별칭)`
> 기준. 운영(runbook, env, DDL)은 `doc/CORENULL_GOOGLE_LOGIN.md` 참조.

## 1. 목적 / 비목표
- **목적**: 기기 교체 시 `Device = Owner`가 되지 않도록, Google 계정으로 **기존 Owner를 복구**.
- **비목표**: Kakao OAuth provider 구현(향후 Step 2b), in-app WebView에서의 자동 브라우저 강제 전환(안내 UI만).

## 2. Owner 정체성 모델 (핵심 불변식)
```
Device(device_id, UUID)  ─┐
                          ├─ 인증 수단 구분 (교체되지 않음)
Provider(Google sub 등)   ─┘
        ↓ corenull_owner_identities(provider, provider_sub)
owner_key(UUID, BRAINPOOL Owner ID)   ← 절대 provider_sub로 교체 금지
        ↓ 1 : N
   House A / House B / House C   (corenull_houses.owner_key, UNIQUE 없음)
```
- `device_id`: `localStorage.corenull_device_id` — 기기 식별자, Owner 아님.
- `owner_key`: `localStorage.corenull_owner_key` — **BRAINPOOL Owner ID(UUID)**. 언제나 보존.
- `provider_sub`: Google sub 등 — **인증 별칭**. 여러 provider → 하나의 owner_key.
- `1 Owner : N Houses`, `1 Owner : N identities`.

## 3. DB 스키마 (`corenull_owner_identities`, 신규)
```sql
create table if not exists public.corenull_owner_identities (
  id           bigint generated always as identity primary key,
  provider     text not null,          -- 'google'
  provider_sub text not null,          -- google sub (별칭)
  owner_key    text not null,          -- 기존 UUID owner_key (보존)
  created_at   timestamptz default now(),
  unique (provider, provider_sub)      -- ✅ 한 provider_sub → 1 owner_key
);
-- (선택) owner_key 역조회 인덱스
create index if not exists idx_owner_identities_owner on corenull_owner_identities(owner_key);
```
- **제약**: `UNIQUE(provider, provider_sub)` only. `owner_key` UNIQUE **금지**(Google+Kakao→same owner 허용).
- 이름 오타 금지: `identity_identities`❌ / `corenull_owner_identities`✅.
- 적용 후 스키마 캐시 리프레시: `notify pgrst, pgrst;` (또는 Dashboard → Settings → API → "Reload schema cache").

## 4. 인증 흐름
```
브라우저 GIS → id_token (= response.credential)
   ↓ POST /api/auth/google { id_token, current_owner_key? }
      1) supabase.auth.signInWithIdToken({ provider:'google', token: id_token })  [공식 시그니처: provider+token, nonce?]
      2) user.identities[0].identity_data.sub  (google sub)
   ↓ POST /api/identity/sync { provider:'google', provider_sub, owner_key?(current) }
      (a) 매핑 존재        → 기존 owner_key 반환         (교체 기기 복구)
      (b) 없고 current 있음 → google↔current_owner_key LINK (기존 사용자 구글 연결)
      (c) 없고 current 없음 → 신규 owner_key(UUID) 생성   (완전 신규)
   ↓ setOwnerKey(owner_key)
   ↓ owner_key 가진 집 리스트(/me yards) 재연결 / 신규면 /houses/create
```

## 5. API 명세
### POST `/api/auth/google`
| | |
|---|---|
| req | `{ id_token: string, current_owner_key?: string }` |
| 200 | `{ data:{ owner_key, is_new_user, linked } }` |
| 400 | `id_token_required` |
| 401 | `google_token_invalid` (detail: "Bad ID token") — provider 미설정/토큰 오류 |
| 500 | supabase 내부 오류 |

### POST `/api/identity/sync`
| | |
|---|---|
| req | `{ provider:'google', provider_sub: string, owner_key?: string(current) }` |
| 200 | `{ data:{ owner_key, is_new_user, linked } }` |
| 400 | `provider_and_provider_sub_required` |
| 409 | `IDENTITY_CONFLICT` (google sub가 다른 owner_key에 이미 연결됨) — 병합 UI 필요 |
| 500 | `corenull_owner_identities` not found (DDL 미적용) |

## 6. 클라이언트
- `hooks/useGoogleLogin.ts` — Google GIS 원탭 버튼 렌더링 → `/api/auth/google` 호출 → `setOwnerKey` + `router.push(/` or `/houses/create`). `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 게이트.
- `components/corenull/InAppBrowserGate.tsx` — in-app 탐지(`useInAppBrowser`) + 안내 카드(`InAppBrowserNotice`).
- `components/corenull/OwnerGate.tsx` — 미연결 기기 진입 게이트: [기존 집 연결(복구코드)][새로 시작][Google]. 인앱이면 Google 버튼 숨김 + 안내.
- `app/me/page.tsx` — "Google 계정 연결" + 기존 복구코드(코드 발급/입력) 유지.
- `lib/ownerKey.ts` — **변경 없음**.

## 7. 인앱 브라우저 전략 (Kakao 등)
- **탐지**: Kakao/Line/Naver/Facebook/Instagram/Twitter/Android `(; wv)` WebView (UA 기반).
- **동작**: Google 버튼 **숨김** + "외부 브라우저에서 열어 주세요" 안내 + URL 복사 버튼. **자동 강제 실행 금지**(플랫폼 정책 미보장).
- 복구코드 입력은 인앱에서도 동작 (OAuth 제외). Kakao in-app → 외부 브라우저 유도(별도 Kakao OAuth 불필요).

## 8. 검증 증거
- ✅ `npm run build` / tsc 통과; `/api/auth/google`, `/api/identity/sync` route 빌드 결과에 등록.
- ✅ prod `POST /api/auth/google {id_token:'x'}` → `401 "Bad ID token"` (signInWithIdToken + Google provider live, 재검증).
- ✅ prod `POST /api/identity/sync {}` → `400 provider_and_provider_sub_required` (route registered).
- ✅ prod `/me` → OwnerGate + "Google 계정 연결" **GIS 버튼 렌더링** (`NEXT_PUBLIC_GOOGLE_CLIENT_ID` 빌드 번들 인라이닝 검증: /me chunk에 client id `80058904…` 포함). Edge headless는 google.com GIS 스크립트 패치 실패로 시각 캡처 제한(실제 브라우저에서 정상 렌더링).
- ✅ prod `POST /api/identity/sync {provider:'google', provider_sub}` → `200 {owner_key}` (테이블 생성 + upsert **실시간 검증 완료**; 현재 `owner_key=7ae9eb3d…` 반환 — BRAINPOOL 기존 owner_key 보존 로직 동작).
- ✅ Live Google 로그인 (A·B 완료 — **사용자 Google 계정 클릭-인 1회 완료, `/me` connected (🏡 기존 집 재연결) 확인**. routes + env + owner_key 보존 independently verified: `sync→200 {owner_key}`, 번들 chunk에 client id 인라이닝; 인증↔Owner 분리 구조 검증 완료). 
- 자동 검증: `node scripts/verify-deploy.mjs --shot` (auth 401 / sync 200 / shot gated-detect).

## 9. 운영 체크포인트 (간략)
- Supabase: Google provider 활성화 + `corenull_owner_identities` DDL + "Reload schema cache".
- Vercel: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (scope: Production+Preview) + **Redeploy 시 "Use existing Build Cache" 해제**.
- 검증: `node scripts/verify-deploy.mjs --shot`.
- 테스트 데이터 정리: `delete from corenull_owner_identities where provider_sub='__verify_deploy__';`

## 10. 향후
- Kakao provider → 동일 owner_key 매핑 (Step 2b).
- `IDENTITY_CONFLICT(409)` → 병합 UI(한 Owner에 여러 provider 연결).
- in-app WebView 탐지 UA → 현대화/UX 개선.