# Step 2a — Google OAuth → Owner 매핑 검증 로그 (2026-09-30)

> Google OAuth → CoreNull 서버(owner 매핑) → 집 만들기 흐름 검증.
> Google OAuth consent screen은 **Testing**(Test user 기준 정상). Published(브랜드 검증)는 별도 예정.

## 흐름 (모두 ✅)

```
Google 로그인 → Google OAuth Client(Test user)
  → Google credential → Supabase Auth
  → auth.identities (provider=google, provider_sub=1125689…026) ✅
  → CoreNull /api/identity/sync (service-role) ✅ 진입
  → corenull_owner_identities INSERT (RLS 우회) ✅
  → /yard → "집 만들기" → POST /api/corenull/houses (service-role) ✅
  → 200 {owner_key} → '/' 이동 ✅
```

## Root cause (RLS INSERT 차단)

- `corenull_owner_identities`, `corenull_houses` : **RLS enabled (정책 0개, default-deny)**.
- 서버 라우트가 `getSupabase()` = `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY` →
  서비스롤 키 미활성 시 **anon key로 fallback** → RLS default-deny →
  `new row violates row-level security policy for table "corenull_owner_identities"`.

> 증거: local `.env`에 `SUPABASE_SERVICE_ROLE_KEY` 존재(라인 12).
>   Vercel prod에도 존재 → service-role이 동작 중.
>   (anon fallback이 침묵적으로 RLS에 걸려서 혼동 발생.)

## Fix (pushed, auto-deploy)

1. `lib/supabase.ts` — `getSupabaseAdmin()` strict service-role client 추가 (anon fallback 없음).
   - 키 없으면 `null` → 라우트가 `500 supabase_service_role_not_configured` (명확한 실패).
2. `app/api/identity/sync/route.js` — `getSupabaseAdmin()` 사용 (owner 매핑 INSERT).
3. `app/api/corenull/houses/route.js` — `handlePost`를 `getSupabaseAdmin()` 사용 (house CREATE INSERT).
4. `app/houses/create/page.tsx` — `완성` 버튼 **상단 → 하단** 이동 (이름·언어·안내문 → 완성).

### 커밋

| 커밋 | 설명 |
|------|------|
| `83eea05` | fix(auth): identity sync uses strict service-role client (bypass RLS) |
| `440b0fb` | fix(house): service-role create + move 완성 button to form bottom |

## 검증 결과 (curl, prod corenull.vercel.app)

### /api/identity/sync (service-role INSERT)
```bash
curl -X POST https://corenull.vercel.app/api/identity/sync \
  -H 'Content-Type: application/json' \
  -d '{"provider":"google","provider_sub":"__verify_marker__"}'
```
```
200
{"data":{"owner_key":"f4345f5d-4766-476c-ab4a-01853c19b5b7","linked":true,"is_new_user":true},"traceId":"326bc412-…"}
```
→ service-role이 `corenull_owner_identities` RLS를 우회, INSERT 성공.

### /api/corenull/houses (new 코드 live 확인 — INSERT 없음)
```bash
curl -X POST https://corenull.vercel.app/api/corenull/houses \
  -H 'Content-Type: application/json' -d '{}'
```
```
500  {"_error":"owner_key_and_title_required","traceId":"eed4ad40-…"}
```
→ 패치한 `handlePost`(getSupabaseAdmin) 경로가 배포돼 있음 확인.

### tsc
```
npx tsc --noEmit   → exit 0 (=== tsc ok ===)
```

## 정리해야 할 테스트 데이터

방금 위 검증(curl)으로 인해 `corenull_owner_identities`에 테스트 행 1개 생김:
- `provider='google'`, `provider_sub='__verify_marker__'`, `owner_key='f4345f5d-4766-476c-ab4a-01853c19b5b7'`

정리 SQL (Supabase Dashboard → SQL Editor, service_role/owner):
```sql
delete from corenull_owner_identities where provider_sub = '__verify_marker__';
```

## 미해결 / 연기 (defer)

- **Google OAuth brand verification** (Testing → Published):
  - Search Console 소유권(DNS TXT 또는 `<meta name="google-site-verification">`).
  - `/privacy` 정책 페이지.
  - `/` 랜딩(현재 `/` → `/yard` redirect) 공개 + 앱 설명 + privacy 링크.
  - → "개인정보 라덴지 그런 페이지 만들고 완성" 예정 (별도 스텝).
- 현재는 **Test user(본인) 기준** Google 로그인 + 집 만들기 정상 동작.
