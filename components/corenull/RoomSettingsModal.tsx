'use client'

import { useState } from 'react'

type Visibility = 'public' | 'invite' | 'family'

interface RoomSettingsModalProps {
  roomId: string
  roomName: string
  visibility: Visibility
  ownerKey: string
  onClose: () => void
  onUpdate: (updated: { room_name: string; visibility: Visibility }) => void
}

export default function RoomSettingsModal({
  roomId,
  roomName,
  visibility,
  ownerKey,
  onClose,
  onUpdate,
}: RoomSettingsModalProps) {
  const [name, setName] = useState(roomName)
  const [vis, setVis] = useState<Visibility>(visibility)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.handle} />
        <div style={styles.title}>방 설정</div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

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
            style={{
              ...styles.visOption,
              ...(vis === opt.value ? styles.visOptionActive : {}),
            }}
            onClick={() => setVis(opt.value)}
          >
            <div>
              <div style={styles.visLabel}>{opt.label}</div>
              <div style={styles.visDesc}>{opt.desc}</div>
            </div>
            <div style={{
              ...styles.radio,
              ...(vis === opt.value ? styles.radioActive : {}),
            }} />
          </div>
        ))}

        <button
          style={{ ...styles.saveBtn, opacity: saving ? 0.5 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '저장 중...' : '저장'}
        </button>

        <button style={styles.cancelBtn} onClick={onClose}>취소</button>
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
  cancelBtn: {
    width: '100%', padding: '12px',
    background: 'none', color: '#9A8470',
    border: 'none', fontSize: 14, cursor: 'pointer',
  },
}