#!/usr/bin/env node
/*
 * scripts/verify-deploy.mjs — Step 2a post-deploy verifier (prod).
 *
 * 배포 직후 이 스크립트 한 번이면 "수동 90초 대기 + 스크린샷" 없이 자동 검증:
 *   1) POST /api/auth/google  { id_token:'x' }
 *        -> 401 = signInWithIdToken + Supabase/Google provider 완전 연결
 *   2) POST /api/identity/sync { provider:'google', provider_sub:'__verify_deploy__' }
 *        -> 200 = corenull_owner_identities 테이블 + 매핑 로직 정상 (owner_key 발급)
 *        -> 500 = 아직 DDL 미적용 -> --wait 초간 폴링 (재시도)
 *   3) --shot : Edge headless로 /me 스크린샷 -> gated hint(26828B) vs GIS 버튼 판별
 *
 * 사용법:
 *   node scripts/verify-deploy.mjs                      # auth+sync 자동 검증
 *   node scripts/verify-deploy.mjs --shot               # + /me 스크린샷
 *   node scripts/verify-deploy.mjs --base http://localhost:3000 --shot
 *   node scripts/verify-deploy.mjs --wait 15            # 최대 폴링 대기(초)
 *
 * 정리:  delete from corenull_owner_identities where provider_sub='__verify_deploy__';
 *   UNIQUE(provider,provider_sub) 이므로 재실행 시 같은 row 재사용 — 데이터 증식 없음.
 */
import { execFileSync } from 'child_process';
import { existsSync, statSync } from 'fs';

const argv = process.argv.slice(2);
const get = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const base = get('--base') || 'https://corenull.vercel.app';
const waitSec = Number(get('--wait') || 90);
const shot = argv.includes('--shot');
const GATED_SIZE = 26828; // /me 가 env 미인라이닝(gated hint) 상태일 때 SSG shell 크기

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function postJson(path, body) {
  const r = await fetch(new URL(path, base).toString(), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  let json = null; try { json = await r.json(); } catch { /* */ }
  return { status: r.status, json };
}
function findEdge() {
  for (const p of [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ]) if (existsSync(p)) return p;
  return null;
}

let ok = true;

// 1) auth wiring (항상 401이면 signInWithIdToken + Google provider 정상)
const auth = await postJson('/api/auth/google', { id_token: 'x' });
const authOk = auth.status === 401;
console.log(`[auth ] POST /api/auth/google -> ${auth.status} ${authOk ? '✅ signInWithIdToken wired (Google provider on)' : `❌ unexpected (${auth.json?._error || ''})`}`);
ok = ok && authOk;

// 2) identity table (DDL 적용될 때까지 폴링)
const t0 = Date.now();
let synced = false;
while ((Date.now() - t0) / 1000 < waitSec) {
  const s = await postJson('/api/identity/sync', { provider: 'google', provider_sub: '__verify_deploy__' });
  if (s.status === 200 && s.json?.data?.owner_key) {
    synced = true;
    console.log(`[sync ] POST /api/identity/sync -> 200 ✅ table ready (owner_key=${String(s.json.data.owner_key).slice(0, 8)}…)`);
    break;
  }
  const left = Math.max(0, Math.round(waitSec - (Date.now() - t0) / 1000));
  console.log(`[sync ] POST /api/identity/sync -> ${s.status} ${s.json?._error || ''} (poll… ${left}s left)`);
  await sleep(5000);
}
if (!synced) {
  ok = false;
  console.log('[sync ] ❌ TIMEOUT — run DDL (doc/CORENULL_GOOGLE_LOGIN.md) + Dashboard → Settings → API → "Reload schema cache"');
}

// 3) optional /me screenshot
if (shot) {
  const edge = findEdge();
  if (!edge) console.log('[shot ] Edge not found — skipped');
  else {
    const out = 'C:/Users/iname/AppData/Local/hermes/cache/scratch/me_verify.png';
    try {
      execFileSync(edge, ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=20000', '--window-size=390,844', `--screenshot=${out}`, `${base}/me`], { timeout: 30000 });
      console.log('[shot ] Edge capture triggered');
    } catch (e) { console.log('[shot ] Edge failed:', e.message); }
    let size = 0;
    for (let i = 0; i < 10; i++) { try { size = statSync(out).size; if (size) break; } catch { /* */ } await sleep(1000); }
    if (size) {
      const gated = size === GATED_SIZE;
      console.log(`[shot ] /me screenshot -> ${size}B ${gated ? '⚠️ gated → "Google 연결은 관리자 설정 중입니다" (NEXT_PUBLIC_GOOGLE_CLIENT_ID not inlined; Redeploy w/ build-cache OFF)' : '✅ non-gated → Google GIS button likely rendered'}`);
    } else console.log('[shot ] screenshot file not produced');
  }
}

console.log(ok ? '\n✅ DONE — Step 2a prod verified (auth wired + sync table ready).' : '\n❌ BLOCKER remains — see messages above.');
process.exit(ok ? 0 : 1);
