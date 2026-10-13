'use client'

// Google Identity Services (GIS) 원탭 버튼을 렌더링하고,
// 구글 id_token을 /api/auth/google 로 전송 → owner_key 획득 → 콜백.
//
// owner_key 보존 원칙:
//  - 기존 매핑 있음     : 서버가 그 owner_key 반환
//  - 매핑 없음 + current_owner_key : google_sub ↔ owner_key LINK
//  - 매핑 없음 + current 없음      : needs_owner_choice (신규 UUID 자동 생성 금지)
//  - 충돌               : IDENTITY_CONFLICT(409)

import { useState, useEffect, useRef, useCallback } from 'react'
import { getOwnerKey } from '@/lib/ownerKey'
import { useInAppBrowser } from '@/components/corenull/InAppBrowserGate'

export type LoginInfo = {
  isNewUser?: boolean
  needsOwnerChoice?: boolean
  linked?: boolean
}

let gisScriptLoaded = false

function loadGisScript(): Promise<void> {
  if (
    gisScriptLoaded &&
    typeof (typeof window !== 'undefined' ? (window as any).google?.accounts?.id : undefined) !==
      'undefined'
  ) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const win = window as any
    if (win.google?.accounts?.id) {
      gisScriptLoaded = true
      return resolve()
    }
    const id = '__g_id_script'
    if (document.getElementById(id)) return resolve()
    const script = document.createElement('script')
    script.id = id
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      gisScriptLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('gis_load_failed'))
    document.head.appendChild(script)
  })
}

async function postGoogleAuth(id_token: string, current_owner_key?: string) {
  const r = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_token,
      current_owner_key: current_owner_key || undefined,
    }),
  })
  const json = await r.json()
  return { status: r.status, json }
}

export function useGoogleLogin(
  onCredential: (ownerKey: string, info?: LoginInfo) => void,
  onNeedsChoice?: () => void,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const { isInApp } = useInAppBrowser()
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential
  const needsChoiceRef = useRef(onNeedsChoice)
  needsChoiceRef.current = onNeedsChoice
  // Google 검증 후 owner 미확정일 때, recover/신규 확정 후 재호출용
  const pendingIdTokenRef = useRef<string | null>(null)

  const handleAuthResult = useCallback((status: number, json: any) => {
    if (json.data?.needs_owner_choice) {
      needsChoiceRef.current?.()
      return
    }
    if (json.data?.owner_key) {
      pendingIdTokenRef.current = null
      callbackRef.current(json.data.owner_key, {
        isNewUser: !!json.data.is_new_user,
        linked: !!json.data.linked,
      })
      return
    }
    if (json._error === 'IDENTITY_CONFLICT') {
      alert('이미 Google 계정이 다른 CoreNull 계정에 연결되어 있어요.')
      return
    }
    alert(json._error || 'Google 로그인에 실패했어요.')
  }, [])

  /** recover / 새로 시작으로 owner_key가 확정된 뒤 Google 매핑 완료 */
  const completeWithOwnerKey = useCallback(async (ownerKey: string) => {
    const id_token = pendingIdTokenRef.current
    if (!id_token) {
      // 토큰 없음 → 호출부가 setOwnerKey / 라우팅 담당 (빈 집 자동 생성 경로 아님)
      return
    }
    setLoading(true)
    try {
      const { status, json } = await postGoogleAuth(id_token, ownerKey)
      // LINK 성공 시 onCredential은 호출하지 않는다 — 호출부가 이미 owner를 확정·이동함
      if (json.data?.owner_key) {
        pendingIdTokenRef.current = null
        return
      }
      if (json._error === 'IDENTITY_CONFLICT') {
        alert('이미 Google 계정이 다른 CoreNull 계정에 연결되어 있어요.')
        return
      }
      if (json._error) {
        alert(json._error || 'Google 계정 연결에 실패했어요.')
      }
    } catch {
      alert('Google 계정 연결에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!clientId || !ref.current || isInApp) return
    let cancelled = false
    const handleResponse = (resp: { credential?: string; [k: string]: unknown }) => {
      const id_token = resp?.credential
      if (!id_token) return
      pendingIdTokenRef.current = id_token
      setLoading(true)
      postGoogleAuth(id_token, getOwnerKey() || undefined)
        .then(({ status, json }) => {
          if (cancelled) return
          handleAuthResult(status, json)
        })
        .catch(() => {
          if (!cancelled) alert('Google 로그인에 실패했어요.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    loadGisScript()
      .then(() => {
        if (cancelled) return
        const g = (window as any).google?.accounts?.id
        if (!g || !ref.current) return
        g.initialize({ client_id: clientId, callback: handleResponse })
        g.renderButton(ref.current, {
          theme: 'filled_black',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          width: 280,
        })
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[useGoogleLogin] gis_load_failed', e)
        setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [clientId, isInApp, handleAuthResult])

  return {
    googleRef: ref,
    loading,
    available: !!clientId && !isInApp,
    error,
    completeWithOwnerKey,
  }
}
