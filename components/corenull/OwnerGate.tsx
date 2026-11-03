'use client'

// Owner 미확인 상태의 진입 게이트.
// House를 만들기 전에 Owner를 복구하거나 신규임을 명시적으로 확정한다.
//
// [기존 집 연결]  → recover 코드 입력 → setOwnerKey → 재진입
// [새로 시작]    → createOwnerKey → /yard (샘플 마당 + 집 만들기 모달)
// [Google 계정] → GIS → /api/auth/google → google sub ↔ owner_key 매핑
//
// 배경: 마당 샘플을 흐리게 깔아 CoreNull이 살아 있는 공간임을 먼저 보여준다.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setOwnerKey, createOwnerKey } from '@/lib/ownerKey'
import { useInAppBrowser, InAppBrowserNotice } from '@/components/corenull/InAppBrowserGate'
import { useGoogleLogin } from '@/hooks/useGoogleLogin'
import YardBlock from '@/components/blocks/YardBlock'
import { createYardSampleView } from '@/lib/livingSamples'

type Mode = 'choice' | 'recover' | 'done'

export default function OwnerGate() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choice')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const { isInApp, name } = useInAppBrowser()
  const { googleRef, available, error } = useGoogleLogin(handleGoogle)

  const sample = useMemo(() => createYardSampleView('owner-gate-preview'), [])

  function handleGoogle(ownerKey: string, info?: { isNewUser?: boolean }) {
    setOwnerKey(ownerKey)
    // 이미 /yard 인 경우 soft push는 OwnerGate가 그대로 남음 → 하드 이동
    window.location.href = info?.isNewUser ? '/yard' : '/'
  }

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
    // 이미 /yard 이면 soft push로는 OwnerGate state가 남음 → 하드 이동
    window.location.href = '/yard'
  }

  return (
    <div style={styles.shell}>
      {/* 뒤: 마당 샘플 (흐림 · 클릭 불가) */}
      <div className="cn-sample-bg" style={styles.bg} aria-hidden>
        <YardBlock
          loading={false}
          background={{
            imageUrl: '/alley/alley-01.jpg',
            position: { x: 50, y: 40, scale: 1 },
          }}
          ring={{
            rings: [
              { index: 0, weight: 0.55 },
              { index: 1, weight: 0.35 },
              { index: 2, weight: 0.22 },
            ],
          }}
          avatar={<span style={{ fontSize: 20 }}>🏡</span>}
          doorplate={{
            langFlag: '🏡',
            title: 'CoreNull',
            description: '미리보기 마당',
            roomCount: 3,
            neighborCount: 2,
          }}
          recommended={sample.recommended}
          onRecommendHouseClick={() => {}}
          neighborFeed={sample.neighborFeed}
          myPosts={sample.myPosts}
        />
      </div>

      {/* 앞: 연결 카드 */}
      <div style={styles.overlay}>
        <div style={styles.card}>
          <div style={styles.emoji}>🏡</div>
          <h1 style={styles.title}>CoreNull</h1>
          <p style={styles.desc}>
            이 기기에서 아직 집이 연결되어 있지 않아요.
            <br />
            기존 집을 연결하거나, 새로 시작하거나 Google 계정으로도 연결할 수 있어요.
          </p>

          {mode === 'choice' && (
            <div style={styles.actions}>
              {isInApp && <InAppBrowserNotice name={name} />}
              <button type="button" style={styles.primary} onClick={() => setMode('recover')}>
                기존 집 연결
              </button>
              <button type="button" style={styles.secondary} onClick={handleNew}>
                새로 시작
              </button>
              {available && !error && (
                <div ref={googleRef} style={styles.googleBtnWrap} />
              )}
              {error && !isInApp && (
                <div style={styles.googleHint}>
                  Google 버튼을 불러오지 못했어요. 브라우저가 google.com을 차단하거나,
                  <button
                    type="button"
                    style={{ ...styles.link, display: 'block', marginTop: 4 }}
                    onClick={() => window.location.reload()}
                  >
                    새로고침
                  </button>
                </div>
              )}
              {!available && !isInApp && !error && (
                <p style={styles.googleHint}>Google 계정 연결은 관리자 설정 중입니다.</p>
              )}
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
                type="button"
                style={{
                  ...styles.primary,
                  opacity: code.length === 6 && !loading ? 1 : 0.4,
                }}
                onClick={handleRecover}
                disabled={code.length !== 6 || loading}
              >
                {loading ? '연결 중…' : '연결하기'}
              </button>
              <button
                type="button"
                style={styles.link}
                onClick={() => {
                  setMode('choice')
                  setMsg('')
                }}
              >
                ← 뒤로
              </button>
              {msg && <p style={styles.msg}>{msg}</p>}
            </div>
          )}

          {mode === 'done' && msg && <p style={styles.msg}>{msg}</p>}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    filter: 'blur(2.5px)',
    opacity: 0.72,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  overlay: {
    position: 'relative',
    zIndex: 200,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'rgba(28,18,8,0.22)',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 20,
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 18px 48px rgba(28,18,8,0.2)',
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
  googleBtnWrap: {
    marginTop: 14,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  googleHint: {
    fontSize: 12,
    color: '#9A8470',
    textAlign: 'center',
    marginTop: 10,
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
