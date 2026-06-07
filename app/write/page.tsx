'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const OWNER_KEY = 'test-device-001'

export default function WritePage() {
  const [content, setContent] = useState('')
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    // 내 집의 방 목록 가져오기
    fetch(`/api/corenull/houses?owner_key=${OWNER_KEY}`)
      .then(r => r.json())
      .then(async d => {
        const houses = d.data || []
        if (houses.length === 0) return
        const houseId = houses[0].id
        const r = await fetch(`/api/corenull/rooms?house_id=${houseId}`)
        const rd = await r.json()
        const roomList = rd.data || []
        setRooms(roomList)
        if (roomList.length > 0) setSelectedRoom(roomList[0])
      })
  }, [])

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
        owner_key: OWNER_KEY,
        content: content.trim(),
        meta: { media: mediaFiles },
        type: 'post',
      }),
    })

    const data = await res.json()
    if (data.data) {
      router.push('/yard')
    }
    setSubmitting(false)
  }

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>새 이야기</span>
        <button
          style={{
            ...styles.submitBtn,
            opacity: (!content.trim() || !selectedRoom || submitting) ? 0.4 : 1,
          }}
          onClick={handleSubmit}
          disabled={!content.trim() || !selectedRoom || submitting}
        >
          {submitting ? '...' : '올리기'}
        </button>
      </div>

      <div style={styles.body}>
        {/* 방 선택 */}
        <div style={styles.roomSelect}>
          <span style={styles.roomLabel}>어느 방에?</span>
          <select
            style={styles.roomDropdown}
            value={selectedRoom?.id || ''}
            onChange={e => {
              const r = rooms.find((r: any) => r.id === e.target.value)
              setSelectedRoom(r)
            }}
          >
            {rooms.map((r: any) => (
              <option key={r.id} value={r.id}>{r.room_name}</option>
            ))}
          </select>
        </div>

        {/* 텍스트 입력 */}
        <textarea
          style={styles.textarea}
          placeholder="오늘 어떤 순간을 남기고 싶으세요?"
          value={content}
          onChange={e => setContent(e.target.value)}
          autoFocus
        />

        {/* 미디어 미리보기 */}
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

        {/* 미디어 추가 */}
        <div style={styles.mediaRow}>
          <button
            style={styles.mediaBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳' : '📷'} {uploading ? '업로드 중...' : '사진/영상'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'fixed', top: 0, left: 0,
    width: '100%', maxWidth: '430px', height: 56,
    background: 'rgba(254,252,248,0.95)', borderBottom: '1px solid rgba(92,61,46,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 100, backdropFilter: 'blur(12px)',
  },
  backBtn: {
    fontSize: 20, color: '#2C1810', background: 'none', border: 'none', cursor: 'pointer',
  },
  headerTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: '#2C1810',
  },
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
  textarea: {
    width: '100%', minHeight: 200,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: 14,
    fontFamily: "'Noto Sans KR', sans-serif", fontSize: 15, lineHeight: 1.7,
    color: '#1C1208', resize: 'none', outline: 'none', marginBottom: 12,
    boxSizing: 'border-box',
  },
  mediaPreview: {
    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12,
  },
  mediaItem: { position: 'relative' },
  mediaThumb: {
    width: 80, height: 80, borderRadius: 10, objectFit: 'cover',
  },
  videoThumb: {
    width: 80, height: 80, borderRadius: 10,
    background: '#2d4a3e', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 28,
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