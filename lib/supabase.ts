// lib/supabase.ts
// brainpool-clean 패턴 그대로 유지
import { createClient } from '@supabase/supabase-js';
 
let supabaseInstance: ReturnType<typeof createClient> | null = null;
 
export function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance;
  }
 
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
 
  if (!url || !key) {
    console.error(
      'Supabase URL 또는 Key가 설정되지 않았습니다. ' +
      'Vercel 환경 변수(NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)를 확인하세요.'
    );
    return null;
  }
 
  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (error) {
    console.error('Supabase 클라이언트 생성 실패:', error);
    return null;
  }
}