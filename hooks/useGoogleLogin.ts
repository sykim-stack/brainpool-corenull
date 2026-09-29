'use client'

// Google Identity Services (GIS) 원탭 버튼을 렌더링하고,
// 구글 id_token을 /api/auth/google 로 전송 → owner_key 획득 → 콜백.
//
// owner_key 보존 원칙:
//  - 기존 사용자 : current_owner_key(getOwnerKey) 전송 → google_sub↔owner_key LINK
//  - 신규 사용자 : 서버가 UUID 생성 → is_new_user=true (클라이언트가 /houses/create 유도)
//  - 충돌         : IDENTITY_CONFLICT(409) → "다른 계정에 연결됨" 안내

import { useState, useEffect, useRef } from 'react'
import { getOwnerKey } from '@/lib/ownerKey'

type LoginInfo = { isNewUser?: boolean }

let gisScriptLoaded = false

function loadGisScript(): Promise<void> {
  if (gisScriptLoaded && typeof (typeof window !== 'undefined' ? (window as any).google?.accounts?.id : undefined) !== 'undefined') {
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
    script.src = 'https://accounts.google.com/gsi/library.js'
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

export function useGoogleLogin(
  onCredential: (ownerKey: string, info?: LoginInfo) => void
) {
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!clientId || !ref.current) return
    let cancelled = false
    const handleResponse = (resp: { credential?: string; [k: string]: unknown }) => {
      const id_token = resp?.credential
      if (!id_token) return
      setLoading(true)
      fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token, current_owner_key: getOwnerKey() || undefined }),
      })
        .then(async (r) => {
          const json = await r.json()
          if (json.data?.owner_key) {
            callbackRef.current(json.data.owner_key, { isNewUser: !!json.data.is_new_user })
          } else if (json._error === 'IDENTITY_CONFLICT') {
            alert('이미 Google 계정이 다른 CoreNull 계정에 연결되어 있어요.')
          } else {
            alert(json._error || 'Google 로그인에 실패했어요.')
          }
        })
        .finally(() => setLoading(false))
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
      .catch(() => {
        if (cancelled) return
        alert('Google 로그인을 불러오지 못했어요.')
      })

    return () => {
      cancelled = true
    }
  }, [clientId])

  return { googleRef: ref, loading, available: !!clientId }
}
