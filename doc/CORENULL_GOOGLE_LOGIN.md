# CoreNull — Google 로그인 & Owner 정체성 (Step 2a)

## 핵심 원칙
- **`owner_key`는 BRAINPOOL Owner ID로 보존** — Google sub으로 교체하지 않는다.
- **`provider_sub`(Google sub 등)은 별칭** — `corenull_owner_identities`에서 `owner_key`로 매핑.
- 인증 수단이 늘어나도 Owner는 1명 → `Google sub ──┐ / owner_key A`  (추후 Kakao 동일)

## 아키텍처
```
Google GIS (브라우저)
   ↓ id_token (response.credential)
/api/auth/google  (signInWithIdToken → google sub 검증)
   ↓
/api/identity/sync  (google_sub ↔ owner_key 매핑: 기존 Owner 복원 / 신규 Owner 생성)
   ↓
owner_key (localStorage setOwnerKey)
   ↓
houses?owner_key=  → House A / House B / House C  (기족 데이터 无変更)
```

## DB — corenull_owner_identities (신규)
```sql
create table if not exists corenull_owner_identities (
  id            bigint generated always as identity primary key,
  provider      text    not null,          -- 'google' | 'kakao'
  provider_sub  text    not null,          -- google sub / kakao sub
  owner_key     text    not null,          -- 기존 UUID owner_key (보존)
  created_at    timestamptz default now(),
  unique (provider, provider_sub)         -- 한 provider_sub → 한 owner_key
);
-- (선택) owner_key → identity 역조회 인덱스
create index if not exists idx_owner_identities_owner on corenull_owner_identities(owner_key);
```
> ⚠️ `owner_key`는 unique가 아니다 → Google + Kakao 가 하나의 Owner에 연결되도록 허용.

## 라우트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/google` | `{ id_token, current_owner_key? }` → `supabase.auth.signInWithIdToken({provider:'google', token})` → google sub → `/api/identity/sync` 위임 → `{ owner_key, is_new_user }` |
| POST | `/api/identity/sync` | `{ provider, provider_sub, owner_key?(current) }` → 매핑 조회/삽입. 기존 Owner 복원 / 신규 생성 / 충돌(409) |

## 클라이언트
- `hooks/useGoogleLogin.ts` — Google GIS 원탭 버튼 (`NEXT_PUBLIC_GOOGLE_CLIENT_ID` 게이트).
- `components/corenull/InAppBrowserGate.tsx` — Kakao/Line/Naver/FB 인앱 탐지 → GIS 버튼 비활성화 + 안내 문구.
- `OwnerGate.tsx` / `app/me/page.tsx` — "Google 계정 연결" 버튼 (in-app이면 안내문만).
- `lib/ownerKey.ts` — **변경 없음** (getOwnerKey/setOwnerKey API 유지).

## 운영 — 관리자가 해야 할 일 (절대 커밋하지 않는다)
0. `.env.local`에 추가 (gitignored):
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth 2.0 클라이언트 ID>
   ```
1. Supabase Dashboard → **Authentication → Providers → Google** 활성화 (Google Cloud에서 발급한 client id/secret 입력).
2. Supabase SQL Editor에서 위 `corenull_owner_identities` DDL 실행.
2-1. (중요) `notify pgrst, pgrst;`만으로는 반영 안 될 수 있음 → **Dashboard → Settings → API → "Reload schema cache"** 버튼 클릭.
3. (선택) `db:push` / `types` 재생성 → `lib/database.types.ts`에 `corenull_owner_identities` 반영.
4. (Vercel) `NEXT_PUBLIC_GOOGLE_CLIENT_ID`는 **빌드 타임**에 번들에 인라이닝되므로, env 추가 후 반드시 **Redeploy**(Deployments → ... → Redeploy) — "Use existing Build Cache"는 해제 권장. 자동 검증: `node scripts/verify-deploy.mjs --shot`

## 흐름별 동작
| 상황 | 동작 |
|------|------|
| 기존 사용자 (owner_key=UUID 있음) | Google → `current_owner_key` 전송 → sync가 google_sub↔UUID 매핑 → 기족 집 즉시 복구 |
| 신규 사용자 (owner_key 없음) | Google → sync가 UUID 새로 생성 → 매핑 → `/houses/create`로 유도 |
| 다른 기기에서 Google 재로그인 | google_sub → 기족 owner_key 복원 → 집 유지 |
| 충돌 (google이 다른 owner_key에 이미 연결) | 409 `IDENTITY_CONFLICT` → "다른 계정에 연결됨" 안내 |

## 보안
- `id_token`은 **서버(`/api/auth/google`)에서만** 검증 (clientId 게이트 + signInWithIdToken).
- `owner_key`는 UUID (비밀 아님)이지만 URL/경로로 노출되지 않음.
- 인앱 WebView에서는 Google 버튼을 감추고 안내만 표시 (토큰 절취 위험 최소화).
