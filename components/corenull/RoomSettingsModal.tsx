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
  onClose: () => void
  onUpdate: (updated: {
    room_name: string
    visibility: Visibility
    seed_mode?: boolean
  }) => void
  onLeft?: () => void
}

/**
 * 방 설정
 * - 씨드 시작은 /write 본경로 (여기서 켜지 않음)
 * - 씨드 진행 중: 초대장 링크 + 해제만
 */
export default function RoomSettingsModal({
  roomId,
  roomName,
  visibility,
  seedMode,
  houseId,
  ownerKey,
  isOwner,
  onClose,
  onUpdate,
  onLeft,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(roomName)
  const [vis, setVis] = useState<Visibility>(visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [seedOff, setSeedOff] = useState(false)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [leavingId, setLeavingId] = useState<string | null>(null)

  const [seedSlug, setSeedSlug] = useState<string | null>(null)
  const [seedEndDate, setSeedEndDate] = useState<string | null>(null)
  const [seedMemo, setSeedMemo] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/corenull/members?house_id=${houseId}&room_id=${roomId}`)
      .then((r) => r.json())
      .then((d) => {
        const all: Participant[] = d.data || []
        setParticipants(all.filter((p) => p.room_id === roomId))
        setLoadingParticipants(false)
      })
      .catch(() => setLoadingParticipants(false))
  }, [houseId, roomId])

  useEffect(() => {
    if (!seedMode) {
      setSeedSlug(null)
      setSeedEndDate(null)
      setSeedMemo('')
      return
    }
    fetch(`/api/corenull/seed-pages?room_id=${encodeURIComponent(roomId)}`)
      .then((r) => r.json())
      .then((d) => {
        const open = (d.data || []).find((p: any) => p.status === 'open')
        if (open) {
          setSeedSlug(open.slug || null)
          setSeedEndDate(open.end_date || null)
          setSeedMemo(open.memo || '')
        }
      })
      .catch(() => {})
  }, [roomId, seedMode])

  const shareUrl =
    typeof window !== 'undefined' && seedSlug
      ? `${window.location.origin}/s/${seedSlug}`
      : seedSlug
        ? `/s/${seedSlug}`
        : ''

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/corenull/rooms', {
      method: 'PATCH',
      credentials: 'include',
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
      onUpdate({
        room_name: data.data.room_name,
        visibility: data.data.visibility,
      })
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
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house_id: houseId,
        owner_key: ownerKey,
        room_id: roomId,
      }),
    })
    const data = await res.json()
    if (data.data?.invite_token) {
      setInviteUrl(
        `https://corenull.vercel.app/invite/${data.data.invite_token}`,
      )
    }
    setInviteLoading(false)
  }

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      /* ignore */
    }
  }

  const handleCopySeed = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(shareUrl)
    }
  }

  const handleSaveMemo = async () => {
    if (!seedSlug) return
    setMemoSaving(true)
    setError('')
    const res = await fetch('/api/corenull/seed-pages', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: seedSlug,
        owner_key: ownerKey,
        memo: seedMemo,
      }),
    })
    const data = await res.json()
    if (!data.data) setError(data._error || '메모 저장 실패')
    setMemoSaving(false)
  }

  const handleRemove = async (deviceId: string) => {
    setLeavingId(deviceId)
    const res = await fetch(
      `/api/corenull/members?house_id=${houseId}&room_id=${roomId}&owner_key=${ownerKey}&device_id=${deviceId}`,
      { method: 'DELETE' },
    )
    const data = await res.json()
    if (data.data?.deleted) {
      setParticipants((prev) => prev.filter((p) => p.device_id !== deviceId))
      if (deviceId === ownerKey) onLeft?.()
    }
    setLeavingId(null)
  }

  const handleSeedOff = async () => {
    setSeedOff(true)
    setError('')
    const res = await fetch('/api/corenull/rooms', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: roomId,
        owner_key: ownerKey,
        seed_mode: false,
      }),
    })
    const data = await res.json()
    if (data.data) {
      setSeedSlug(null)
      onUpdate({
        room_name: data.data.room_name,
        visibility: data.data.visibility,
        seed_mode: false,
      })
    } else {
      setError(data._error || '씨드 해제에 실패했어요')
    }
    setSeedOff(false)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.handle} />
        <div style={styles.title}>방 설정</div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        {isOwner && (
          <>
            <div style={styles.sectionLabel}>방 이름</div>
            <input
              style={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />

            <div style={styles.sectionLabel}>공개 범위</div>
            {(
              [
                {
                  value: 'public' as const,
                  label: '🌍 공개',
                  desc: '마당에 노출됩니다',
                  bg: '#E8EFE3',
                  fg: '#4A5240',
                },
                {
                  value: 'invite' as const,
                  label: '👥 이웃공개',
                  desc: '이웃에게 공개돼요',
                  bg: '#FBEEDD',
                  fg: '#8A5423',
                },
                {
                  value: 'private' as const,
                  label: '🔒 비공개',
                  desc: '초대받은 참여자만 볼 수 있어요',
                  bg: '#EFE6E1',
                  fg: '#5C3D2E',
                },
              ] as const
            ).map((opt) => (
              <div
                key={opt.value}
                style={{
                  ...styles.visOption,
                  ...(vis === opt.value
                    ? { border: `1.5px solid ${opt.fg}`, background: opt.bg }
                    : {}),
                }}
                onClick={() => setVis(opt.value)}
              >
                <div>
                  <div
                    style={{
                      ...styles.visLabel,
                      color: vis === opt.value ? opt.fg : styles.visLabel.color,
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={styles.visDesc}>{opt.desc}</div>
                </div>
                <div
                  style={{
                    ...styles.radio,
                    ...(vis === opt.value
                      ? { border: `6px solid ${opt.fg}` }
                      : {}),
                  }}
                />
              </div>
            ))}

            <button
              style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
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
            {participants.map((p) => (
              <div key={p.device_id} style={styles.participantRow}>
                <span style={styles.participantId}>
                  {p.device_id === ownerKey ? '나' : p.device_id.slice(0, 8)}
                </span>
                {(isOwner && p.device_id !== ownerKey) ||
                (!isOwner && p.device_id === ownerKey) ? (
                  <button
                    style={styles.removeBtn}
                    onClick={() => handleRemove(p.device_id)}
                    disabled={leavingId === p.device_id}
                  >
                    {leavingId === p.device_id
                      ? '...'
                      : p.device_id === ownerKey
                        ? '나가기'
                        : '내보내기'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <>
            {!inviteUrl ? (
              <button
                style={styles.inviteBtn}
                onClick={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? '생성 중...' : '참여자 초대'}
              </button>
            ) : (
              <div style={styles.inviteBox}>
                <div style={styles.inviteUrl}>{inviteUrl}</div>
                <button style={styles.copyBtn} onClick={handleCopyInvite}>
                  링크 복사
                </button>
              </div>
            )}
          </>
        )}

        {isOwner && seedMode && (
          <div style={styles.seedBox}>
            <div style={styles.seedOffTitle}>🌱 씨드 진행 중</div>
            {seedEndDate && (
              <div style={styles.seedOffDesc}>
                종료일{' '}
                {new Date(seedEndDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}

            {seedSlug ? (
              <>
                <div style={{ ...styles.sectionLabel, marginTop: 10 }}>
                  초대장 링크
                </div>
                <div style={styles.inviteBox}>
                  <div style={styles.inviteUrl}>{shareUrl}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={`/s/${seedSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...styles.copyBtn,
                        flex: 1,
                        textAlign: 'center',
                        textDecoration: 'none',
                        background: '#4A7C3F',
                      }}
                    >
                      열기
                    </a>
                    <button
                      style={{ ...styles.copyBtn, flex: 1 }}
                      onClick={handleCopySeed}
                    >
                      {copied ? '복사됨' : '링크 복사'}
                    </button>
                  </div>
                </div>

                <div style={{ ...styles.sectionLabel, marginTop: 10 }}>
                  초대장 메모
                </div>
                <textarea
                  style={styles.memoInput}
                  value={seedMemo}
                  onChange={(e) => setSeedMemo(e.target.value)}
                  placeholder={'인사 · 장소 · 일시 · 계좌 등'}
                  rows={3}
                />
                <button
                  style={{
                    ...styles.copyBtn,
                    width: '100%',
                    marginTop: 6,
                    opacity: memoSaving ? 0.5 : 1,
                  }}
                  onClick={handleSaveMemo}
                  disabled={memoSaving}
                >
                  {memoSaving ? '저장 중...' : '메모 저장'}
                </button>
              </>
            ) : (
              <div style={styles.seedOffDesc}>
                초대장을 불러오는 중이거나 아직 없어요. 글쓰기로 씨드를
                시작하면 링크가 생깁니다.
              </div>
            )}

            <div style={{ ...styles.seedOffRow, marginTop: 12 }}>
              <div>
                <div style={styles.seedOffTitle}>씨드 해제</div>
                <div style={styles.seedOffDesc}>
                  중도 종료. 글은 남고 열매 없이 닫아요.
                </div>
              </div>
              <button
                style={{
                  ...styles.seedOffBtn,
                  opacity: seedOff ? 0.5 : 1,
                }}
                onClick={handleSeedOff}
                disabled={seedOff}
              >
                {seedOff ? '...' : '해제'}
              </button>
            </div>
          </div>
        )}

        {isOwner && !seedMode && (
          <div style={styles.hintBox}>
            <div style={styles.seedOffTitle}>🌱 씨드</div>
            <div style={styles.seedOffDesc}>
              씨드는 글쓰기에서 시작해요. 시작 직후 초대장 링크가 만들어집니다.
            </div>
          </div>
        )}

        <button style={styles.cancelBtn} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: '430px',
    background: '#FEFCF8',
    borderRadius: '20px 20px 0 0',
    padding: '16px 20px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: 'rgba(92,61,46,0.2)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#2C1810',
    fontFamily: "'Noto Serif KR', serif",
    textAlign: 'center',
    marginBottom: 4,
  },
  error: {
    background: 'rgba(200,60,40,0.08)',
    border: '1px solid rgba(200,60,40,0.25)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: '#A33',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#5C4A35',
    marginTop: 4,
  },
  input: {
    width: '100%',
    height: 44,
    background: '#F5F0E8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 14,
    color: '#1C1208',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  visOption: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(92,61,46,0.12)',
    background: '#F5F0E8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  visLabel: { fontSize: 14, fontWeight: 500, color: '#1C1208' },
  visDesc: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid rgba(92,61,46,0.2)',
    flexShrink: 0,
  },
  saveBtn: {
    width: '100%',
    padding: '14px',
    background: '#2C1810',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
  },
  hint: { fontSize: 13, color: '#9A8470' },
  participantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  participantRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#F5F0E8',
    borderRadius: 10,
  },
  participantId: { fontSize: 13, color: '#1C1208' },
  removeBtn: {
    fontSize: 12,
    color: '#A33',
    background: 'none',
    border: '1px solid rgba(163,51,51,0.25)',
    borderRadius: 8,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  inviteBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(58,82,120,0.08)',
    border: '1px solid rgba(58,82,120,0.25)',
    borderRadius: 12,
    fontSize: 14,
    color: '#3A5278',
    fontWeight: 500,
    cursor: 'pointer',
  },
  inviteBox: {
    background: '#F5F0E8',
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  inviteUrl: {
    fontSize: 11,
    color: '#5C4A35',
    wordBreak: 'break-all',
  },
  copyBtn: {
    padding: '8px',
    background: '#2C1810',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  seedBox: {
    background: 'rgba(74,124,63,0.06)',
    border: '1px solid rgba(74,124,63,0.2)',
    borderRadius: 12,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  hintBox: {
    background: '#F5F0E8',
    borderRadius: 12,
    padding: '12px 14px',
  },
  seedOffRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  seedOffTitle: { fontSize: 13, fontWeight: 500, color: '#1C1208' },
  seedOffDesc: { fontSize: 11, color: '#9A8470', marginTop: 2, lineHeight: 1.4 },
  seedOffBtn: {
    padding: '8px 14px',
    background: '#4A7C3F',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
  },
  memoInput: {
    width: '100%',
    background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    lineHeight: 1.5,
    color: '#1C1208',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical' as const,
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  cancelBtn: {
    width: '100%',
    padding: '12px',
    background: 'none',
    color: '#9A8470',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
  },
}
