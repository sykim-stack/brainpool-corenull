'use client'

// Owner 미확인 상태의 진입 게이트.
// House를 만들기 전에 Owner를 복구하거나 신규임을 명시적으로 확정한다.
//
// [기존 집 연결] → recover 코드 입력 → setOwnerKey → 새로고침/진입
// [새로 시작]   → createOwnerKey → /houses/create

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOwnerKey, createOwnerKey } from '@/lib/ownerKey'

type Mode = 'choice' | 'recover' | 'done'

export default function OwnerGate() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choice')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRecover = async () => {
    if (!code.trim() || loading) return
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/identity?action=link-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (data.data?.owner_key) {
        setOwnerKey(data.data.owner_key)
        setMsg('연결 완료. 내 집으로 이동합니다.')
        setMode('done')
        setTimeout(() => {
          window.location.href = '/'
        }, 600)
      } else {
        setMsg(data._error || '코드가 올바르지 않아요')
      }
    } catch {
      setMsg('연결에 실패했어요. 다시 시도해 주세요.')
    }
    setLoading(false)
  }

  const handleNew = () => {
    createOwnerKey()
    router.push('/houses/create')
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.emoji}>🏡</div>
        <h1 style={styles.title}>CoreNull</h1>
        <p style={styles.desc}>
          이 기기에서 아직 집이 연결되어 있지 않아요.
          <br />
          기존 집을 연결하거나, 새로 시작할 수 있어요.
        </p>

        {mode === 'choice' && (
          <div style={styles.actions}>
            <button style={styles.primary} onClick={() => setMode('recover')}>
              기존 집 연결
            </button>
            <button style={styles.secondary} onClick={handleNew}>
              새로 시작
            </button>
          </div>
        )}

        {mode === 'recover' && (
          <div style={styles.recover}>
            <p style={styles.hint}>
              다른 기기(나 페이지)에서 발급한 6자리 코드를 입력하세요.
            </p>
            <input
              style={styles.input}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            <button
              style={{
                ...styles.primary,
                opacity: code.length === 6 && !loading ? 1 : 0.4,
              }}
              onClick={handleRecover}
              disabled={code.length !== 6 || loading}
            >
              {loading ? '연결 중…' : '연결하기'}
            </button>
            <button style={styles.link} onClick={() => { setMode('choice'); setMsg('') }}>
              ← 뒤로
            </button>
            {msg && <p style={styles.msg}>{msg}</p>}
          </div>
        )}

        {mode === 'done' && msg && <p style={styles.msg}>{msg}</p>}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 20,
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#2C1810',
    margin: '0 0 8px',
  },
  desc: {
    fontSize: 14,
    color: '#9A8470',
    lineHeight: 1.6,
    margin: '0 0 24px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  primary: {
    width: '100%',
    padding: '14px 16px',
    background: '#2C1810',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondary: {
    width: '100%',
    padding: '14px 16px',
    background: '#F5F0E8',
    color: '#2C1810',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 500,
    cursor: 'pointer',
  },
  recover: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'stretch',
  },
  hint: {
    fontSize: 13,
    color: '#5C4A35',
    margin: 0,
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    height: 52,
    textAlign: 'center',
    background: '#F5F0E8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 8,
    color: '#2C1810',
    outline: 'none',
    boxSizing: 'border-box',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#9A8470',
    fontSize: 13,
    cursor: 'pointer',
    padding: 8,
  },
  msg: {
    fontSize: 13,
    color: '#5C4A35',
    margin: '8px 0 0',
  },
}
