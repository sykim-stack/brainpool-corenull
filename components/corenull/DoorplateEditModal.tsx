'use client'

import { useState } from 'react'

export interface DoorplateEditModalProps {
  houseId: string
  ownerKey: string
  title: string
  description?: string | null
  onClose: () => void
  onSaved: (house: any) => void
}

/** 마당 문패 빠른 수정 — 이름·소개만. 이미지는 /me/house */
export default function DoorplateEditModal({
  houseId,
  ownerKey,
  title: initialTitle,
  description: initialDescription,
  onClose,
  onSaved,
}: DoorplateEditModalProps) {
  const [title, setTitle] = useState(initialTitle || '')
  const [description, setDescription] = useState(initialDescription || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/corenull/houses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house_id: houseId,
          owner_key: ownerKey,
          title: title.trim(),
          description: description.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.data) {
        onSaved(data.data)
        onClose()
      } else {
        setError(data._error || '저장에 실패했어요')
      }
    } catch {
      setError('네트워크 오류')
    }
    setSaving(false)
  }

  return (
    <div style={styles.backdrop} onClick={onClose} role="presentation">
      <div
        style={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="문패 수정"
      >
        <div style={styles.head}>
          <span style={styles.headTitle}>문패 수정</span>
          <button type="button" style={styles.close} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>집 이름</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
          autoFocus
        />

        <label style={styles.label}>소개</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={100}
          placeholder="이 집은 어떤 공간인가요?"
        />

        <button
          type="button"
          style={{
            ...styles.save,
            opacity: !title.trim() || saving ? 0.45 : 1,
          }}
          disabled={!title.trim() || saving}
          onClick={handleSave}
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(28,18,8,0.35)',
    zIndex: 80,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    background: '#FEFCF8',
    borderRadius: '16px 16px 0 0',
    padding: '16px 16px 28px',
    boxShadow: '0 -8px 32px rgba(44,24,16,0.12)',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headTitle: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 16,
    fontWeight: 600,
    color: '#1C1208',
  },
  close: {
    border: 'none',
    background: 'none',
    fontSize: 14,
    color: '#9A8470',
    cursor: 'pointer',
    padding: 4,
  },
  error: {
    background: 'rgba(200,60,40,0.08)',
    border: '1px solid rgba(200,60,40,0.2)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 12,
    color: '#A33',
    marginBottom: 10,
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#9A8470',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    width: '100%',
    height: 44,
    boxSizing: 'border-box',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 14,
    color: '#1C1208',
    background: '#fff',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 72,
    boxSizing: 'border-box',
    border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    color: '#1C1208',
    background: '#fff',
    outline: 'none',
    resize: 'none',
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  save: {
    marginTop: 16,
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: 12,
    background: '#2C1810',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
