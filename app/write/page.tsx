'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'

export default function WritePage() {
  const [content, setContent] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [houseId, setHouseId] = useState<string | null>(null)
  const [ownerKey, setOwnerKey] = useState('')

  const [showNewRoom, setShowNewRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [isSeed, setIsSeed] = useState(false)
  const [bloomDate, setBloomDate] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const key = getDeviceId()
    setOwnerKey(key)
    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then(r => r.json())
      .then(async d => {
        const houses = d.data || []
        if (houses.length === 0) return
        const house = houses[0]
        setHouseId(house.id)
        const r = await fetch(`/api/corenull/rooms?house_id=${house.id}`)
        const rd = await r.json()
        const roomList = rd.data || []
        setRooms(roomList)
        if (roomList.length > 0) setSelectedRoom(roomList[0])
      })
  }, [])

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !houseId) return
    setCreatingRoom(true)
    const res = await fetch('/api/corenull/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house_id: houseId,
        owner_key: ownerKey,
        room_name: newRoomName.trim(),
        room_type: isSeed ? 'seed' : 'normal',
        visibility: 'public',
        seed_mode: isSeed,
        bloom_date: isSeed && bloomDate ? bloomDate : null,
      }),
    })
    const data = await res.json()
    if (data.data) {
      const created = data.data
      setRooms(prev => [...prev, created])
      setSelectedRoom(created)
      setShowNewRoom(false)
      setNewRoomName('')
      setIsSeed(false)
      setBloomDate('')
    }
    setCreatingRoom(false)
  }

  const handleFileSelect = async (e: any) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    const form = new FormData()
    files.forEach((f: any) => form.append('files', f))
    const res = await fetch('/api/corenull/upload', { method: 'POST', body: form })
    const data = await res.json()
    setMediaFiles(prev => [...prev, ...(data.data || [])])
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!content.trim() || !selectedRoom) return
    setSubmitting(true)
    const res = await fetch('/api/corenull/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: selectedRoom.id,
        owner_key: ownerKey,
        content: content.trim(),
        meta: { media: mediaFiles },
        type: selectedRoom.seed_mode ? 'seed' : 'post',
      }),
    })
    const data = await res.json()
    if (data.data) router.push('/yard')
    setSubmitting(false)
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 오늘 날짜 (min 값용)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>새 이야기</span>
        <button
          style={{ ...styles.submitBtn, opacity: (!content.trim() || !selectedRoom || submitting) ? 0.4 : 1 }}
          onClick={handleSubmit}
          disabled={!content.trim() || !selectedRoom || submitting}
        >
          {submitting ? '...' : '올리기'}
        </button>
      </div>

      <div style={styles.body}>
        {!showNewRoom ? (
          <div style={styles.roomSelect}>
            <span style={styles.roomLabel}>어느 방에?</span>
            <select
              style={styles.roomDropdown}
              value={selectedRoom?.id || ''}
              onChange={e => {
                if (e.target.value === '__new__') { setShowNewRoom(true); return }
                const r = rooms.find((r: any) => r.id === e.target.value)
                setSelectedRoom(r)
              }}
            >
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.room_name}{r.seed_mode ? ' 🌱' : ''}
                </option>
              ))}
              <option value="__new__">+ 새 방 만들기</option>
            </select>
          </div>
        ) : (
          <div style={styles.newRoomBox}>
            <div style={styles.newRoomHeader}>
              <span style={styles.roomLabel}>새 방 만들기</span>
              <button style={styles.cancelBtn} onClick={() => { setShowNewRoom(false); setNewRoomName(''); setIsSeed(false); setBloomDate('') }}>취소</button>
            </div>

            <input
              style={styles.newRoomInput}
              placeholder="방 이름"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              maxLength={20}
              autoFocus
            />

            {/* 씨앗 토글 */}
            <div style={styles.toggleRow} onClick={() => setIsSeed(v => !v)}>
              <div style={styles.toggleLeft}>
                <span style={{ fontSize: 18 }}>🌱</span>
                <div>
                  <div style={styles.toggleTitle}>씨앗</div>
                  <div style={styles.toggleDesc}>스스로에게 한 약속</div>
                </div>
              </div>
              <div style={{ ...styles.toggleSwitch, background: isSeed ? '#2C1810' : '#e0d8d0' }}>
                <div style={{ ...styles.toggleThumb, transform: isSeed ? 'translateX(20px)' : 'translateX(2px)' }} />
              </div>
            </div>

            {/* bloom_date — 씨앗일 때만 표시 */}
            {isSeed && (
              <div style={styles.bloomBox}>
                <div style={styles.bloomLabel}>🌸 꽃 피는 날 (선택)</div>
                <div style={styles.bloomDesc}>이 날이 되면 씨앗이 꽃으로 변해요</div>
                <input
                  type="date"
                  style={styles.dateInput}
                  value={bloomDate}
                  min={today}
                  onChange={e => setBloomDate(e.target.value)}
                />
              </div>
            )}

            <button
              style={{ ...styles.createRoomBtn, opacity: (!newRoomName.trim() || creatingRoom) ? 0.4 : 1 }}
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim() || creatingRoom}
            >
              {creatingRoom ? '만드는 중...' : '방 만들기'}
            </button>
          </div>
        )}

        <textarea
          style={styles.textarea}
          placeholder="오늘 어떤 순간을 남기고 싶으세요?"
          value={content}
          onChange={e => setContent(e.target.value)}
          autoFocus={!showNewRoom}
        />

        {mediaFiles.length > 0 && (
          <div style={styles.mediaPreview}>
            {mediaFiles.map((m, i) => (
              <div key={i} style={styles.mediaItem}>
                {m.type === 'image' ? (
                  <img src={m.url} alt="" style={styles.mediaThumb} />
                ) : (
                  <div style={styles.videoThumb}>🎬</div>
                )}
                <button style={styles.removeBtn} onClick={() => removeMedia(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={styles.mediaRow}>
          <button style={styles.mediaBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⏳' : '📷'} {uploading ? '업로드 중...' : '사진/영상'}
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: { fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer' },
  headerTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810' },
  submitBtn: {
    padding: '8px 16px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  body: { padding: '16px' },
  roomSelect: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: '10px 14px', marginBottom: 12,
  },
  roomLabel: { fontSize: 13, color: '#9A8470', flexShrink: 0 },
  roomDropdown: {
    flex: 1, border: 'none', background: 'none',
    fontSize: 14, color: '#1C1208', fontFamily: "'Noto Sans KR', sans-serif",
    outline: 'none', cursor: 'pointer',
  },
  newRoomBox: {
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: '14px', marginBottom: 12,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  newRoomHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cancelBtn: { fontSize: 13, color: '#9A8470', background: 'none', border: 'none', cursor: 'pointer' },
  newRoomInput: {
    width: '100%', height: 44,
    background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 10, padding: '0 12px',
    fontSize: 14, color: '#1C1208', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', background: '#F5F0E8', borderRadius: 10, cursor: 'pointer',
  },
  toggleLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  toggleTitle: { fontSize: 13, fontWeight: 500, color: '#1C1208' },
  toggleDesc: { fontSize: 11, color: '#9A8470', marginTop: 1 },
  toggleSwitch: {
    width: 44, height: 24, borderRadius: 12, position: 'relative',
    transition: 'background 0.2s', flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute', top: 2, width: 20, height: 20,
    borderRadius: '50%', background: 'white',
    transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  },
  bloomBox: {
    background: 'rgba(193,127,60,0.06)', border: '1px solid rgba(193,127,60,0.2)',
    borderRadius: 10, padding: '12px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  bloomLabel: { fontSize: 13, fontWeight: 500, color: '#C17F3C' },
  bloomDesc: { fontSize: 11, color: '#9A8470', marginBottom: 6 },
  dateInput: {
    width: '100%', height: 40,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 8, padding: '0 12px',
    fontSize: 14, color: '#1C1208', outline: 'none', boxSizing: 'border-box',
  },
  createRoomBtn: {
    width: '100%', padding: '12px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  textarea: {
    width: '100%', minHeight: 200,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: 14,
    fontFamily: "'Noto Sans KR', sans-serif", fontSize: 15, lineHeight: 1.7,
    color: '#1C1208', resize: 'none', outline: 'none', marginBottom: 12,
    boxSizing: 'border-box',
  },
  mediaPreview: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  mediaItem: { position: 'relative' },
  mediaThumb: { width: 80, height: 80, borderRadius: 10, objectFit: 'cover' },
  videoThumb: {
    width: 80, height: 80, borderRadius: 10,
    background: '#2d4a3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
  },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: '50%',
    background: '#2C1810', color: 'white',
    border: 'none', fontSize: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  mediaRow: { display: 'flex', gap: 8 },
  mediaBtn: {
    flex: 1, height: 48,
    background: '#FEFCF8', border: '1px dashed rgba(92,61,46,0.2)',
    borderRadius: 12, fontSize: 14, color: '#9A8470', cursor: 'pointer',
  },
}