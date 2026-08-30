'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()

  const [invite, setInvite] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'valid' | 'error' | 'joining' | 'done'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/corenull/invite?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d._error) {
          setErrorMsg(
            d._error === 'token_expired' ? '초대 링크가 만료됐어요.' :
            d._error === 'token_already_used' ? '이미 사용된 초대 링크예요.' :
            '유효하지 않은 초대 링크예요.'
          )
          setStatus('error')
        } else {
          setInvite(d.data)
          setStatus('valid')
        }
      })
  }, [token])

  const handleJoin = async () => {
    setStatus('joining')
    const device_id = getDeviceId()
    const res = await fetch('/api/corenull/invite', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, device_id }),
    })
    const data = await res.json()
    if (data._error) {
      if (data._error === 'owner_cannot_join') {
        // 집주인은 바로 해당 공간(room 초대면 room, house 초대면 house)으로 이동
        if (invite?.room_id) {
          router.push(`/rooms/${invite.room_id}`)
        } else {
          router.push(`/houses/${invite?.corenull_houses?.id}`)
        }
        return
      }
      setErrorMsg('참여에 실패했어요. 다시 시도해주세요.')
      setStatus('error')
    } else {
      setStatus('done')
      // room_id가 있으면 참여방으로, 없으면 house로 이동
      const dest = data.data.room_id ? `/rooms/${data.data.room_id}` : `/houses/${data.data.house_id}`
      setTimeout(() => router.push(dest), 1500)
    }
  }

  const LANG_FLAG: Record<string, string> = {
    ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
  }

  const isRoomInvite = !!invite?.room_id
  const roomName = invite?.corenull_rooms?.room_name

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {status === 'loading' && (
          <div style={styles.center}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
            <p style={styles.sub}>초대 확인 중...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.center}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😢</div>
            <p style={styles.errorText}>{errorMsg}</p>
            <button style={styles.btnPrimary} onClick={() => router.push('/')}>
              홈으로
            </button>
          </div>
        )}

        {status === 'valid' && invite && (
          <div style={styles.center}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{isRoomInvite ? '🌱' : '🏡'}</div>
            <div style={styles.houseTitle}>
              {LANG_FLAG[invite.corenull_houses?.primary_language] || '🌐'} {invite.corenull_houses?.title}
            </div>
            {isRoomInvite ? (
              <>
                <p style={styles.sub}>
                  <strong>{roomName}</strong> 방에 참여하도록 초대됐어요
                </p>
                <p style={styles.hint}>이 방에만 글을 쓸 수 있어요. 집의 다른 부분엔 관여하지 않아요.</p>
              </>
            ) : (
              <p style={styles.sub}>이 집에 초대됐어요</p>
            )}
            <p style={styles.expiry}>
              초대 유효기간: {new Date(invite.expired_at).toLocaleDateString('ko-KR')}
            </p>
            <button style={styles.btnPrimary} onClick={handleJoin}>
              {isRoomInvite ? '🌱 참여하기' : '🚪 집에 들어가기'}
            </button>
          </div>
        )}

        {status === 'joining' && (
          <div style={styles.center}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚪</div>
            <p style={styles.sub}>입장 중...</p>
          </div>
        )}

        {status === 'done' && (
          <div style={styles.center}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={styles.sub}>환영합니다! 이동 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: '20px', background: '#FBF8F2',
  },
  card: {
    width: '100%', maxWidth: '380px',
    background: '#FEFCF8', borderRadius: 24,
    border: '1px solid rgba(92,61,46,0.12)',
    padding: '40px 28px',
    boxShadow: '0 4px 32px rgba(44,24,16,0.1)',
  },
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  houseTitle: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 22, fontWeight: 700, color: '#2C1810', textAlign: 'center',
  },
  sub: { fontSize: 14, color: '#9A8470', textAlign: 'center' },
  hint: { fontSize: 12, color: '#B0A08C', textAlign: 'center', lineHeight: 1.5 },
  expiry: { fontSize: 12, color: '#C17F3C' },
  errorText: { fontSize: 14, color: '#5C3D2E', textAlign: 'center' },
  btnPrimary: {
    marginTop: 8, width: '100%', padding: '14px',
    background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
}