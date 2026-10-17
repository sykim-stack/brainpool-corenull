'use client'

import { useRef, useState } from 'react'
import { prepareUploadFile } from '@/lib/compressMedia'
import HeroImageEditor, { HeroImagePosition } from './HeroImageEditor'

type View = 'yard' | 'living' | 'avatar'

type Props = {
  houseId: string
  ownerKey: string
  view: View
  imageUrl?: string | null
  position?: Partial<HeroImagePosition> | null
  onSaved: (house: Record<string, unknown>) => void
  variant?: 'overlay' | 'compact'
}

const VIEW_META: Record<View, { imageKey: string; positionKey: string | null; label: string }> = {
  yard: { imageKey: 'yard_image_url', positionKey: 'yard_image_position', label: '마당' },
  living: { imageKey: 'living_image_url', positionKey: 'living_image_position', label: '거실' },
  avatar: { imageKey: 'avatar_url', positionKey: null, label: '프로필' },
}

export default function InlineHeroImageControls({
  houseId,
  ownerKey,
  view,
  imageUrl,
  position,
  onSaved,
  variant = 'overlay',
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const meta = VIEW_META[view]
  const canPosition = Boolean(meta.positionKey && imageUrl)

  const pickImage = () => {
    setMessage('')
    setOpen(false)
    fileRef.current?.click()
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setMessage('')
    try {
      const prepared = await prepareUploadFile(file)
      if (!prepared.ok) {
        setMessage(prepared.error)
        return
      }
      const form = new FormData()
      form.append('files', prepared.file)
      const upload = await fetch('/api/corenull/upload', { method: 'POST', body: form })
      const uploadData = await upload.json()
      const item = uploadData.data?.[0]
      if (!item?.url || item._error) throw new Error(item?._error || '업로드 실패')

      await patchHouse({ [meta.imageKey]: item.url })
      setMessage('저장됐어요')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '업로드에 실패했어요')
    } finally {
      setUploading(false)
    }
  }

  const patchHouse = async (patch: Record<string, unknown>) => {
    const response = await fetch('/api/corenull/houses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: houseId, owner_key: ownerKey, ...patch }),
    })
    const data = await response.json()
    if (!data.data) throw new Error(data._error || '저장 실패')
    onSaved(data.data)
    return data.data
  }

  const savePosition = async (next: HeroImagePosition) => {
    if (!meta.positionKey) return
    await patchHouse({ [meta.positionKey]: next })
    setMessage('위치가 저장됐어요')
  }

  const isOverlay = variant === 'overlay'
  const isAvatar = view === 'avatar'

  return (
    <>
      <div
        style={{
          ...(isOverlay ? (isAvatar ? styles.avatarOverlay : styles.overlay) : styles.compactWrap),
        }}
        className={isOverlay && !isAvatar ? 'cn-hero-edit-zone' : undefined}
        onMouseLeave={() => setOpen(false)}
      >
        {!open ? (
          <button
            type="button"
            className={isAvatar ? 'cn-avatar-edit-btn' : 'cn-hero-edit-btn'}
            style={isAvatar ? styles.avatarEditBtn : styles.editBtn}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setOpen(true)
            }}
            disabled={uploading}
            aria-label={`${meta.label} 수정`}
          >
            {uploading ? '…' : '수정'}
          </button>
        ) : (
          <div
            style={isAvatar ? styles.avatarMenu : styles.menu}
            className={isAvatar ? 'cn-avatar-menu-open' : undefined}
          >
            <button type="button" style={styles.menuBtn} onClick={pickImage} disabled={uploading}>
              {uploading ? '올리는 중…' : imageUrl ? '사진 바꾸기' : '사진 등록'}
            </button>
            {canPosition && (
              <button
                type="button"
                style={styles.menuBtn}
                onClick={() => {
                  setOpen(false)
                  setEditing(true)
                }}
                disabled={uploading}
              >
                위치 조절
              </button>
            )}
            <button type="button" style={styles.menuCancel} onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        )}
        {message && <span style={styles.message}>{message}</span>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        hidden
        onChange={uploadImage}
      />
      {editing && imageUrl && meta.positionKey && (
        <HeroImageEditor
          url={imageUrl}
          value={position}
          label={`${meta.label} Hero`}
          onSave={savePosition}
          onClose={() => setEditing(false)}
        />
      )}
      <style>{`
        /* 배경 Hero: 호버 시 수정 버튼 */
        .cn-hero-edit-zone .cn-hero-edit-btn {
          opacity: 0;
          transition: opacity .18s ease;
        }
        .cn-hero-edit-zone:hover .cn-hero-edit-btn,
        .cn-hero-edit-zone:focus-within .cn-hero-edit-btn {
          opacity: 1;
        }
        /* 프로필: 링 호버/포커스 시에만 표시 (항상 노출 금지) */
        .cn-avatar-edit-zone .cn-avatar-edit-btn {
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events: none;
        }
        .cn-avatar-edit-zone:hover .cn-avatar-edit-btn,
        .cn-avatar-edit-zone:focus-within .cn-avatar-edit-btn,
        .cn-avatar-edit-zone .cn-avatar-edit-btn.cn-open {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 4,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 14,
    pointerEvents: 'auto',
  },
  avatarOverlay: {
    position: 'relative',
    zIndex: 30,
    pointerEvents: 'auto',
  },
  compactWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    pointerEvents: 'auto',
    border: '1px solid rgba(254,252,248,0.7)',
    background: 'rgba(28,18,8,0.55)',
    color: '#FEFCF8',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
  avatarEditBtn: {
    pointerEvents: 'auto',
    position: 'relative',
    zIndex: 31,
    minWidth: 44,
    height: 36,
    padding: '0 12px',
    borderRadius: 999,
    border: '2px solid #FEFCF8',
    background: 'rgba(28,18,8,0.88)',
    color: '#FEFCF8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    touchAction: 'manipulation',
  },
  menu: {
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: 'rgba(28,18,8,0.78)',
    backdropFilter: 'blur(10px)',
    borderRadius: 14,
    padding: 8,
    minWidth: 128,
  },
  avatarMenu: {
    pointerEvents: 'auto',
    position: 'absolute',
    right: 0,
    bottom: '100%',
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    background: 'rgba(28,18,8,0.92)',
    borderRadius: 12,
    padding: 6,
    minWidth: 120,
    zIndex: 40,
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  },
  menuBtn: {
    border: 0,
    background: 'rgba(254,252,248,0.12)',
    color: '#FEFCF8',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 12,
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  menuCancel: {
    border: 0,
    background: 'none',
    color: 'rgba(254,252,248,0.65)',
    padding: '6px 12px',
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  message: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 14,
    bottom: 14,
    color: '#FEFCF8',
    fontSize: 11,
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  },
}
