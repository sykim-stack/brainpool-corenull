'use client'

import { useEffect, useState } from 'react'

type Visibility = 'public' | 'invite' | 'family'

interface Participant {
  device_id: string
  room_id: string | null
  joined_at: string
}

interface RoomSettingsModalProps {
  roomId: string
  roomName: string
  visibility: Visibility
  houseId: string
  ownerKey: string   // 지금 접속한 사람의 device_id
  isOwner: boolean   // house owner인지
  onClose: () => void
  onUpdate: (updated: { room_name: string; visibility: Visibility }) => void
  onRoomClosed?: () => void
  onLeft?: () => void // 본인이 나가기 완료했을 때
}

export default function RoomSettingsModal({
  roomId,
  roomName,
  visibility,
  houseId,
  ownerKey,
  isOwner,
  onClose,
  onUpdate,
  onRoomClosed,
  onLeft,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(roomName)
  const [vis, setVis] = useState<Visibility>(visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  // 참여자 목록 — 이 room에 한정된 참여(room_id === roomId)만 표시.
  // house 전체 멤버(room_id null, 이웃초대로 생긴 것)는 "참여자"
  // 개념과 다르므로 여기서는 걸러낸다.
  useEffect(() => {
    fetch(`/api/corenull/members?house_id=${houseId}&room_id=${roomId}`)
      .then(r => r.json())
      .then(d => {
        const all: Participant[] = d.data || []
        setParticipants(all.filter(p => p.room_id === roomId))
        setLoadingParticipants(false)
      })
  }, [houseId, roomId])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const res = await fetch('/api/corenull/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        owner_key: ownerKey,
        room_name: name.trim(),
        visibility: vis,
      }),
    })

    const data = await res.json()
    if (data.data) {
      onUpdate({ room_name: data.data.room_name, visibility: data.data.visibility })
      onClose()
    } else {
      setError(data._error || '저장에 실패했어요')
    }
    setSaving(false)
  }

  const handleInvite = async () => {
    if (inviteLoading) return
    setInviteLoading(true)
    const res = await fetch('/api/corenull/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: houseId, owner_key: ownerKey, room_id: roomId }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setInviteUrl(`https://corenull.vercel.app/invite/${data.data.invite_token}`)
    }
    setInviteLoading(false)
  }

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      // clipboard 미지원 환경은 조용히 무시 — 링크는 화면에 이미 보임
    }
  }

  // 내보내기(owner가 참여자를) / 나가기(본인이 자기 자신을) — 양방향 해지
  const handleRemove = async (deviceId: string) => {
    setLeavingId(deviceId)
    const res = await fetch(
      `/api/corenull/members?house_id=${houseId}&room_id=${roomId}&owner_key=${ownerKey}&device_id=${deviceId}`,
      { method: 'DELETE' }
    )
    const data = await res.json()
    if (data.data?.deleted) {
      setParticipants(prev => prev.filter(p => p.device_id !== deviceId))
      if (deviceId === ownerKey) onLeft?.()
    }
    setLeavingId(null)
  }

  const handleClose = async () => {
    setClosing(true)
    const res = await fetch('/api/corenull/rooms', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, owner_key: ownerKey, action: 'close' }),
    })
    const data = await res.json()
    if (data.data) {
      onRoomClosed?.()
      onClose()
    } else {
      setError(data._error || '방 폐쇄에 실패했어요')
    }
    setClosing(false)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.handle} />
        <div style={styles.title}>방 설정</div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {/* room_name/visibility 편집 — owner 전용 */}
        {isOwner && (
          <>
            <div style={styles.sectionLabel}>방 이름</div>
            <input
              style={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />

            <div style={styles.sectionLabel}>공개 범위</div>
            {([
              { value: 'public', label: '🌍 공개', desc: '마당에 노출됩니다' },
              { value: 'invite', label: '👥 이웃공개', desc: '초대한 이웃만 볼 수 있어요' },
              { value: 'family', label: '👨‍👩‍👧 가족', desc: '초대한 가족만 볼 수 있어요' },
            ] as const).map(opt => (
              <div
                key={opt.value}
                style={{ ...styles.visOption, ...(vis === opt.value ? styles.visOptionActive : {}) }}
                onClick={() => setVis(opt.value)}
              >
                <div>
                  <div style={styles.visLabel}>{opt.label}</div>
                  <div style={styles.visDesc}>{opt.desc}</div>
                </div>
                <div style={{ ...styles.radio, ...(vis === opt.value ? styles.radioActive : {}) }} />
              </div>
            ))}

            <button style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '이름/공개범위 저장'}
            </button>
          </>
        )}

        {/* 참여자 — owner/참여자 공통으로 보임 */}
        <div style={styles.sectionLabel}>참여자</div>
        {loadingParticipants ? (
          <div style={styles.hint}>불러오는 중...</div>
        ) : participants.length === 0 ? (
          <div style={styles.hint}>아직 참여자가 없어요</div>
        ) : (
          <div style={styles.participantList}>
            {participants.map(p => (
              <div key={p.device_id} style={styles.participantRow}>
                <span style={styles.participantId}>
                  {p.device_id === ownerKey ? '나' : p.device_id.slice(0, 8)}
                </span>
                {/* owner는 남을 내보낼 수 있고, 본인은 스스로 나갈 수 있다.
                    owner가 자기 자신을 내보내는 UI는 만들지 않는다 — 방을
                    끝내려면 아래 '방 폐쇄'로 가는 게 명확하다. */}
                {(isOwner && p.device_id !== ownerKey) || (!isOwner && p.device_id === ownerKey) ? (
                  <button
                    style={styles.removeBtn}
                    onClick={() => handleRemove(p.device_id)}
                    disabled={leavingId === p.device_id}
                  >
                    {leavingId === p.device_id
                      ? '...'
                      : p.device_id === ownerKey ? '나가기' : '내보내기'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {/* 참여자 초대 — owner 전용 */}
        {isOwner && (
          <>
            {!inviteUrl ? (
              <button style={styles.inviteBtn} onClick={handleInvite} disabled={inviteLoading}>
                {inviteLoading ? '생성 중...' : '참여자 초대'}
              </button>
            ) : (
              <div style={styles.inviteBox}>
                <div style={styles.inviteUrl}>{inviteUrl}</div>
                <button style={styles.copyBtn} onClick={handleCopyInvite}>링크 복사</button>
              </div>
            )}
          </>
        )}

        {/* 방 폐쇄 — owner 전용 */}
        {isOwner && (
          <>
            {!confirmClose ? (
              <button style={styles.closeRoomBtn} onClick={() => setConfirmClose(true)}>
                방 폐쇄
              </button>
            ) : (
              <div style={styles.confirmBox}>
                <div style={styles.confirmText}>
                  방을 폐쇄하면 더 이상 글을 쓸 수 없어요. 지금까지의 글은 각자의 서재에 남아요.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...styles.closeRoomBtn, flex: 1, opacity: closing ? 0.5 : 1 }} onClick={handleClose} disabled={closing}>
                    {closing ? '폐쇄 중...' : '폐쇄 확정'}
                  </button>
                  <button style={styles.cancelBtn} onClick={() => setConfirmClose(false)}>취소</button>
                </div>
              </div>
            )}
          </>
        )}

        <button style={styles.cancelBtn} onClick={onClose}>닫기</button>
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
    maxHeight: '85vh', overflowY: 'auto',
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
  error: {
    background: 'rgba(200,60,40,0.08)', border: '1px solid rgba(200,60,40,0.25)',
    borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#A33',
  },
  sectionLabel: { fontSize: 12, fontWeight: 500, color: '#5C4A35', marginTop: 4 },
  input: {
    width: '100%', height: 44,
    background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 10, padding: '0 12px',
    fontSize: 14, color: '#1C1208', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  visOption: {
    padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#F5F0E8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  visOptionActive: { border: '1.5px solid #2C1810', background: 'rgba(44,24,16,0.04)' },
  visLabel: { fontSize: 14, fontWeight: 500, color: '#1C1208' },
  visDesc: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  radio: {
    width: 20, height: 20, borderRadius: '50%',
    border: '2px solid rgba(92,61,46,0.2)', flexShrink: 0,
  },
  radioActive: { border: '6px solid #2C1810' },
  saveBtn: {
    width: '100%', padding: '14px',
    background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4,
  },
  hint: { fontSize: 13, color: '#9A8470' },
  participantList: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  participantRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: '#F5F0E8', borderRadius: 10,
  },
  participantId: { fontSize: 13, color: '#1C1208' },
  removeBtn: {
    fontSize: 12, color: '#A33', background: 'none',
    border: '1px solid rgba(163,51,51,0.25)', borderRadius: 8,
    padding: '4px 10px', cursor: 'pointer',
  },
  inviteBtn: {
    width: '100%', padding: '12px',
    background: 'rgba(74,82,64,0.08)', border: '1px solid rgba(74,82,64,0.2)',
    borderRadius: 12, fontSize: 14, color: '#4A5240', fontWeight: 500, cursor: 'pointer',
  },
  inviteBox: {
    background: '#F5F0E8', borderRadius: 10, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  inviteUrl: { fontSize: 11, color: '#5C4A35', wordBreak: 'break-all' },
  copyBtn: {
    padding: '8px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
  },
  closeRoomBtn: {
    width: '100%', padding: '12px',
    background: 'rgba(163,51,51,0.08)', border: '1px solid rgba(163,51,51,0.25)',
    borderRadius: 12, fontSize: 14, color: '#A33', fontWeight: 500, cursor: 'pointer',
  },
  confirmBox: {
    background: 'rgba(163,51,51,0.06)', borderRadius: 12, padding: 12,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  confirmText: { fontSize: 12, color: '#5C4A35', lineHeight: 1.5 },
  cancelBtn: {
    width: '100%', padding: '12px',
    background: 'none', color: '#9A8470',
    border: 'none', fontSize: 14, cursor: 'pointer',
  },
}