'use client'

import { useEffect, useState } from 'react'

interface ShareModalProps {
  url: string
  title: string
  onClose: () => void
}

export default function ShareModal({ url, title, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [isKakao, setIsKakao] = useState(false)

  useEffect(() => {
    setIsKakao(/KAKAOTALK/i.test(navigator.userAgent))
  }, [])

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        onClose()
      } catch {
        // 사용자가 취소한 경우 무시
      }
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard 미지원 시 fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.handle} />

        <div style={styles.title}>공유하기</div>
        <div style={styles.url}>{url}</div>

        {/* 1순위: navigator.share */}
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button style={styles.primaryBtn} onClick={handleShare}>
            🔗 공유하기
          </button>
        )}

        {/* 2순위: 링크 복사 */}
        <button style={styles.secondaryBtn} onClick={handleCopy}>
          {copied ? '✅ 복사됨!' : '📋 링크 복사'}
        </button>

        {/* 3순위: 카카오 인앱 안내 */}
        {isKakao && (
          <div style={styles.kakaoNotice}>
            카카오톡 브라우저에서는 공유가 제한될 수 있어요.<br />
            <strong>우측 메뉴 → 다른 브라우저로 열기</strong>를 눌러주세요.
          </div>
        )}

        <button style={styles.closeBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: '430px',
    background: '#FEFCF8', borderRadius: '20px 20px 0 0',
    padding: '16px 20px 32px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'rgba(92,61,46,0.2)',
    alignSelf: 'center', marginBottom: 8,
  },
  title: {
    fontSize: 16, fontWeight: 600, color: '#2C1810',
    fontFamily: "'Noto Serif KR', serif", textAlign: 'center', marginBottom: 4,
  },
  url: {
    fontSize: 11, color: '#9A8470', textAlign: 'center',
    padding: '8px 12px', background: '#F5F0E8', borderRadius: 8,
    wordBreak: 'break-all',
  },
  primaryBtn: {
    width: '100%', padding: '14px',
    background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  secondaryBtn: {
    width: '100%', padding: '14px',
    background: '#F5F0E8', color: '#2C1810',
    border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12,
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  kakaoNotice: {
    fontSize: 12, color: '#5C4A35', lineHeight: 1.6,
    padding: '12px 14px',
    background: 'rgba(193,127,60,0.08)',
    borderRadius: 10, textAlign: 'center',
  },
  closeBtn: {
    width: '100%', padding: '12px',
    background: 'none', color: '#9A8470',
    border: 'none', fontSize: 14, cursor: 'pointer',
  },
}