'use client'

import { useEffect, useRef, useState } from 'react'
import { setOwnerKey } from '@/lib/ownerKey'

export default function CoreHandoffPage() {
  const started = useRef(false)
  const [message, setMessage] = useState('인증을 확인하고 있어요…')

  useEffect(() => {
    if (started.current) return
    started.current = true

    const ticket = new URLSearchParams(window.location.hash.slice(1)).get('ticket') || ''
    window.history.replaceState(null, '', window.location.pathname)
    if (!ticket) {
      setMessage('인증 전달 정보가 없거나 이미 만료되었습니다. 이전 Core에서 다시 시작해 주세요.')
      return
    }

    fetch('/api/auth/core-session', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null)
        if (!response.ok || !result?.data?.owner_key) {
          if (result?._error === 'owner_link_required') {
            throw new Error(
              '이 인증 사용자와 연결된 기존 CoreNull Owner가 없어 연결을 거부했습니다. 새 Owner 생성이나 기존 데이터를 자동 병합하지 않았습니다.',
            )
          }
          throw new Error(
            '인증 전달에 실패했거나 ticket이 만료·사용되었습니다. 이전 Core에서 다시 시작해 주세요.',
          )
        }
        setOwnerKey(result.data.owner_key)
        setMessage('기존 Owner 연결을 확인했습니다. CoreNull로 이동합니다…')
        window.location.replace('/')
      })
      .catch((error) => setMessage(error?.message || '인증 전달에 실패했습니다.'))
  }, [])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#F5F0E8',
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 440,
          borderRadius: 18,
          background: '#FEFCF8',
          padding: 28,
          color: '#2C1810',
          textAlign: 'center',
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 20 }}>CoreNull 인증 연결</h1>
        <p role="status" style={{ lineHeight: 1.6 }}>
          {message}
        </p>
      </section>
    </main>
  )
}
