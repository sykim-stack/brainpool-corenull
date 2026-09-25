'use client'

import { useRef, useState } from 'react'
import { prepareUploadFile } from '@/lib/compressMedia'
import HeroImageEditor, { HeroImagePosition } from './HeroImageEditor'

type View = 'yard' | 'living'

type Props = {
  houseId: string
  ownerKey: string
  view: View
  imageUrl?: string | null
  position?: Partial<HeroImagePosition> | null
  onSaved: (patch: Record<string, unknown>) => void
}

export default function InlineHeroImageControls({ houseId, ownerKey, view, imageUrl, position, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const imageKey = view === 'yard' ? 'yard_image_url' : 'living_image_url'
  const positionKey = view === 'yard' ? 'yard_image_position' : 'living_image_position'
  const label = view === 'yard' ? '마당 Hero' : '거실 Hero'

  const pickImage = () => {
    setMessage('')
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

      const saved = await patchHouse({ [imageKey]: item.url })
      if (saved) setMessage('Hero 이미지가 저장됐어요')
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
    await patchHouse({ [positionKey]: next })
    setMessage('위치가 저장됐어요')
  }

  return (
    <>
      <div style={styles.wrap}>
        <button type="button" style={styles.button} onClick={pickImage} disabled={uploading}>
          {uploading ? '업로드 중…' : imageUrl ? `${label} 바꾸기` : `${label} 이미지 등록`}
        </button>
        {imageUrl && (
          <button type="button" style={styles.button} onClick={() => setEditing(true)} disabled={uploading}>
            위치 조절
          </button>
        )}
        {message && <span style={styles.message}>{message}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" hidden onChange={uploadImage} />
      {editing && imageUrl && (
        <HeroImageEditor
          url={imageUrl}
          value={position}
          label={label}
          onSave={savePosition}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  button: { border: '1px solid rgba(254,252,248,0.65)', background: 'rgba(28,18,8,0.46)', color: '#FEFCF8', borderRadius: 999, padding: '7px 12px', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(6px)' },
  message: { width: '100%', textAlign: 'center', color: '#FEFCF8', fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.35)' },
}
