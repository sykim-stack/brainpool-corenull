'use client'

import { useEffect, useState } from 'react'

type Visibility = 'public' | 'invite' | 'private'

interface Participant {
  device_id: string
  room_id: string | null
  joined_at: string
}

interface RoomSettingsModalProps {
  roomId: string
  roomName: string
  visibility: Visibility
  seedMode: boolean
  houseId: string
  ownerKey: string
  isOwner: boolean
  coverImageUrl?: string | null
  onClose: () => void
  onUpdate: (updated: {
    room_name: string
    visibility: Visibility
    seed_mode?: boolean
    cover_image_url?: string | null
  }) => void
  onLeft?: () => void
}

export default function RoomSettingsModal({
  roomId,
  roomName,
  visibility,
  seedMode,
  houseId,
  ownerKey,
  isOwner,
  coverImageUrl: _coverImageUrl,
  onClose,
  onUpdate,
  onLeft,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(roomName)
  const [vis, setVis] = useState<Visibility>(visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [seedOff, setSeedOff] = useState(false)
  const [seedOnMode, setSeedOnMode] = useState(false)
  const [bloomDate, setBloomDate] = useState('')
  const [seedOn, setSeedOn] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  const [seedSlug, setSeedSlug] = useState<string | null>(null)
  const [seedEndDate, setSeedEndDate] = useState<string | null>(null)
  const [seedMemo, setSeedMemo] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/corenull/members?house_id=${houseId}&room_id=${roomId}&owner_key=${ownerKey}`)
      .then(r => r.json())
      .then(d => setParticipants(d.data || []))
      .catch(() => {})
      .finally(() => setLoadingParticipants(false))
  }, [houseId, roomId, ownerKey])

  useEffect(() => {
    if (!seedMode) {
      setSeedSlug(null)
      return
    }
    fetch(`/api/corenull/seed-pages?room_id=${encodeURIComponent(roomId)}`)
      .then(r => r.json())
      .then(d => {
        const pages = d.data || []
        const open = pages.find((p: any) => p.status === 'open') || pages[0]
        if (open) {
          setSeedSlug(open.slug)
          setSeedEndDate(open.end_date)
          setSeedMemo(open.memo || '')
        }
      })
      .catch(() => {})
  }, [roomId, seedMode])

  const deployUrl =
    typeof window !== 'undefined' && seedSlug
      ? `${window.location.origin}/s/${seedSlug}`
      : seedSlug
        ? `/s/${seedSlug}`
        : ''

  const handleSaveMemo = async () => {
    if (!seedSlug) return
    setMemoSaving(true)
    const res = await fetch('/api/corenull/seed-pages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: seedSlug, memo: seedMemo, owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data) {
      setMemoSaved(true)
      setTimeout(() => setMemoSaved(false), 2000)
    }
    setMemoSaving(false)
  }

  const handleCopyDeploy = async () => {
    if (!deployUrl) return
    try {
      await navigator.clipboard.writeText(deployUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

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
    try { await navigator.clipboard.writeText(inviteUrl) } catch {}
  }

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

  // Seed on/off handlers kept minimal for restore; full seed UI may be partial
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.handle} />
        <div style={styles.title}>방 설정</div>
        {error && <div style={styles.error}>⚠️ {error}</div>}

        {isOwner && (
          <>
            <div style={styles.sectionLabel}>방 이름</div>
            <input style={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={20} />
            <div style={styles.sectionLabel}>공개 범위</div>
            {([
              { value: 'public' as const, label: '🌍 공개', desc: '마당에 노출됩니다', bg: '#E8EFE3', fg: '#4A5240' },
              { value: 'invite' as const, label: '👥 이웃공개', desc: '이웃에게 공개돼요', bg: '#FBEEDD', fg: '#8A5423' },
              { value: 'private' as const, label: '🔒 비공개', desc: '초대받은 참여자만 볼 수 있어요', bg: '#EFE6E1', fg: '#5C3D2E' },
            ]).map(opt => (
              <div
                key={opt.value}
                style={{
                  ...styles.visOption,
                  ...(vis === opt.value ? { border: `1.5px solid ${opt.fg}`, background: opt.bg } : {}),
                }}
                onClick={() => setVis(opt.value)}
              >
                <div>
                  <div style={{ ...styles.visLabel, color: vis === opt.value ? opt.fg : styles.visLabel.color }}>{opt.label}</div>
                  <div style={styles.visDesc}>{opt.desc}</div>
                </div>
                <div style={{ ...styles.radio, ...(vis === opt.value ? { border: `6px solid ${opt.fg}` } : {}) }} />
              </div>
            ))}
            <button style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '이름/공개범위 저장'}
            </button>
          </>
        )}

        <div style={styles.sectionLabel}>참여자</div>
        {loadingParticipants ? (
          <div style={styles.hint}>불러오는 중...</div>
        ) : participants.length === 0 ? (
          <div style={styles.hint}>아직 참여자가 없어요</div>
        ) : (
          <div style={styles.participantList}>
            {participants.map(p => (
              <div key={p.device_id} style={styles.participantRow}>
                <span style={styles.participantId}>{p.device_id.slice(0, 12)}…</span>
                {isOwner && (
                  <button
                    type="button"
                    style={styles.removeBtn}
                    disabled={leavingId === p.device_id}
                    onClick={() => handleRemove(p.device_id)}
                  >
                    내보내기
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            <div style={styles.sectionLabel}>초대 링크</div>
            <button type="button" style={styles.saveBtn} onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? '만드는 중…' : '초대 링크 만들기'}
            </button>
            {inviteUrl && (
              <div style={styles.hint}>
                <button type="button" onClick={handleCopyInvite} style={styles.copyBtn}>복사</button>
                <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{inviteUrl}</span>
              </div>
            )}
          </>
        )}

        {seedMode && seedSlug && (
          <>
            <div style={styles.sectionLabel}>초대장</div>
            <div style={styles.hint}>
              <button type="button" onClick={handleCopyDeploy} style={styles.copyBtn}>
                {copied ? '복사됨' : '링크 복사'}
              </button>
              <span style={{ fontSize: 11 }}>{deployUrl}</span>
            </div>
            <textarea
              style={styles.input}
              value={seedMemo}
              onChange={e => setSeedMemo(e.target.value)}
              rows={3}
              placeholder="초대장 안내 메모"
            />
            <button type="button" style={styles.saveBtn} onClick={handleSaveMemo} disabled={memoSaving}>
              {memoSaved ? '저장됨' : memoSaving ? '저장 중…' : '메모 저장'}
            </button>
          </>
        )}

        <button type="button" style={styles.closeBtn} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(28,18,8,0.4)', zIndex: 100,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
    background: '#FEFCF8', borderRadius: '20px 20px 0 0', padding: '12px 20px 32px',
  },
  handle: { width: 40, height: 4, borderRadius: 2, background: 'rgba(92,61,46,0.2)', margin: '0 auto 16px' },
  title: { fontSize: 18, fontWeight: 600, color: '#2C1810', marginBottom: 16 },
  error: { fontSize: 13, color: '#A33', marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: 600, color: '#9A8470', margin: '16px 0 8px' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid rgba(92,61,46,0.15)', fontSize: 14, boxSizing: 'border-box',
  },
  visOption: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(92,61,46,0.12)',
    marginBottom: 8, cursor: 'pointer', background: '#fff',
  },
  visLabel: { fontSize: 14, fontWeight: 500, color: '#2C1810' },
  visDesc: { fontSize: 12, color: '#9A8470', marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(92,61,46,0.25)', flexShrink: 0 },
  saveBtn: {
    width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: 'none',
    background: '#2C1810', color: '#FEFCF8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  hint: { fontSize: 13, color: '#9A8470', padding: '8px 0' },
  participantList: { display: 'flex', flexDirection: 'column', gap: 8 },
  participantRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' },
  participantId: { fontSize: 13, color: '#5C4A35' },
  removeBtn: { fontSize: 12, color: '#A33', border: 'none', background: 'none', cursor: 'pointer' },
  copyBtn: { marginRight: 8, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(92,61,46,0.2)', borderRadius: 8, padding: '4px 8px', background: '#fff' },
  closeBtn: {
    width: '100%', marginTop: 20, padding: '12px', borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.15)', background: '#F5F0E8', color: '#5C4A35',
    fontSize: 14, cursor: 'pointer',
  },
}
