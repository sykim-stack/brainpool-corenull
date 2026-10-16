'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import { prepareUploadFile } from '@/lib/compressMedia'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import HeroImageEditor, { HeroImagePosition } from '@/components/corenull/HeroImageEditor'

// House 이미지 등록 — /write 업로드 파이프라인 재사용 + 클라이언트 압축.
// 프로필(avatar)은 마당 Hero Ring에서만 다룬다. /me 에서는 제외.

type SlotKey = 'yard_image_url' | 'living_image_url'
type HeroSlotKey = SlotKey

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: 'yard_image_url', label: '마당 배경', hint: '골목 · 마당 Hero' },
  { key: 'living_image_url', label: '거실 배경', hint: '복도 · 거실 Hero' },
]

export default function HouseImagesPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [ownerKey, setOwnerKey] = useState('')
  const [house, setHouse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null)
  const [editingHero, setEditingHero] = useState<HeroSlotKey | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    if (!key) {
      setLoading(false)
      return
    }
    fetch(`/api/corenull/houses?owner_key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        setHouse(d.data?.[0] || null)
        setLoading(false)
      })
  }, [])

  const pickSlot = (key: SlotKey) => {
    setActiveSlot(key)
    setMsg('')
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeSlot || !house || !ownerKey) return

    setUploading(true)
    setMsg('압축 중…')
    try {
      const prepared = await prepareUploadFile(file)
      if (!prepared.ok) {
        setMsg(prepared.error)
        setUploading(false)
        setActiveSlot(null)
        return
      }

      setMsg('업로드 중…')
      const form = new FormData()
      form.append('files', prepared.file)
      const up = await fetch('/api/corenull/upload', { method: 'POST', body: form })
      const upData = await up.json()
      const item = upData.data?.[0]
      if (!item?.url || item._error) {
        setMsg(item?._error || upData._error || '업로드 실패')
        setUploading(false)
        setActiveSlot(null)
        return
      }

      setSaving(true)
      setMsg('저장 중…')
      const patch: Record<string, string> = { [activeSlot]: item.url }
      const res = await fetch('/api/corenull/houses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_id: house.id, owner_key: ownerKey, ...patch }),
      })
      const data = await res.json()
      if (data.data) {
        setHouse(data.data)
        setMsg('저장됐어요')
      } else {
        setMsg(data._error || '저장 실패')
      }
    } catch {
      setMsg('업로드 중 오류')
    }
    setUploading(false)
    setSaving(false)
    setActiveSlot(null)
  }

  const clearSlot = async (key: SlotKey) => {
    if (!house || !ownerKey) return
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/corenull/houses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ house_id: house.id, owner_key: ownerKey, [key]: null }),
    })
    const data = await res.json()
    if (data.data) {
      setHouse(data.data)
      setMsg('지웠어요')
    } else {
      setMsg(data._error || '삭제 실패')
    }
    setSaving(false)
  }

  const saveHeroPosition = async (key: HeroSlotKey, position: HeroImagePosition) => {
    if (!house || !ownerKey) return
    const positionKey = key === 'yard_image_url' ? 'yard_image_position' : 'living_image_position'
    const res = await fetch('/api/corenull/houses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house_id: house.id,
        owner_key: ownerKey,
        [positionKey]: position,
      }),
    })
    const data = await res.json()
    if (data.data) {
      setHouse(data.data)
      setMsg('Hero 위치가 저장됐어요')
    } else {
      throw new Error(data._error || '위치 저장 실패')
    }
  }

  if (loading) {
    return (
      <div>
        <TopBar logo={<CoreNullLogo size="sm" />} title="집 이미지" />
        <div style={styles.loading}>…</div>
      </div>
    )
  }

  if (!house) {
    return (
      <div>
        <TopBar logo={<CoreNullLogo size="sm" />} title="집 이미지" />
        <div style={styles.empty}>
          <p>먼저 집을 만들어 주세요.</p>
          <button type="button" style={styles.primaryBtn} onClick={() => router.push('/houses/create')}>
            집 만들기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="집 이미지" />
      <div style={styles.body}>
        <p style={styles.lead}>
          마당·거실 배경만 여기서 올려요.
          <span style={styles.leadSub}> 프로필 사진은 마당 Hero Ring에서 다뤄요.</span>
        </p>
        {msg && <div style={styles.msg}>{msg}</div>}

        {SLOTS.map((slot) => {
          const url = house?.[slot.key] as string | null | undefined
          return (
            <div key={slot.key} style={styles.card}>
              <div style={styles.cardHead}>
                <div style={styles.cardTitle}>{slot.label}</div>
                <div style={styles.cardHint}>{slot.hint}</div>
              </div>
              <div
                style={{
                  ...styles.preview,
                  backgroundImage: url ? `url(${url})` : 'linear-gradient(135deg,#c4b5a5,#9a8470)',
                }}
              >
                {!url && <span style={styles.previewEmpty}>기본 배경</span>}
              </div>
              <div style={styles.actions}>
                <button
                  type="button"
                  style={styles.mediaBtn}
                  onClick={() => pickSlot(slot.key)}
                  disabled={uploading || saving}
                >
                  {uploading && activeSlot === slot.key ? '올리는 중…' : url ? '바꾸기' : '올리기'}
                </button>
                {url && (
                  <button
                    type="button"
                    style={styles.adjustBtn}
                    onClick={() => setEditingHero(slot.key)}
                    disabled={uploading || saving}
                  >
                    위치 조절
                  </button>
                )}
                {url && (
                  <button
                    type="button"
                    style={styles.clearBtn}
                    onClick={() => clearSlot(slot.key)}
                    disabled={uploading || saving}
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={onFile}
      />
      {editingHero && house?.[editingHero] && (
        <HeroImageEditor
          url={house[editingHero]}
          label={editingHero === 'yard_image_url' ? '마당 Hero' : '거실 Hero'}
          value={house[editingHero === 'yard_image_url' ? 'yard_image_position' : 'living_image_position']}
          onSave={(position) => saveHeroPosition(editingHero, position)}
          onClose={() => setEditingHero(null)}
        />
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '50vh', fontSize: 40,
  },
  body: { padding: '16px 16px 40px' },
  lead: { fontSize: 15, color: '#1C1208', marginBottom: 16, lineHeight: 1.5 },
  leadSub: { fontSize: 12, color: '#9A8470' },
  msg: {
    background: 'rgba(74,82,64,0.08)', borderRadius: 10, padding: '10px 12px',
    fontSize: 13, color: '#4A5240', marginBottom: 12,
  },
  empty: { textAlign: 'center', padding: '80px 24px', color: '#9A8470' },
  primaryBtn: {
    marginTop: 16, padding: '12px 20px', background: '#2C1810', color: '#fff',
    border: 'none', borderRadius: 12, fontSize: 14, cursor: 'pointer',
  },
  card: {
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 14, padding: 14, marginBottom: 14,
  },
  cardHead: { marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: '#1C1208' },
  cardHint: { fontSize: 11, color: '#9A8470', marginTop: 2 },
  preview: {
    height: 120, borderRadius: 12, backgroundSize: 'cover', backgroundPosition: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  previewEmpty: { fontSize: 13, color: 'rgba(254,252,248,0.9)' },
  actions: { display: 'flex', gap: 8 },
  mediaBtn: {
    flex: 1, height: 44, background: '#FEFCF8',
    border: '1px dashed rgba(92,61,46,0.25)', borderRadius: 10,
    fontSize: 13, color: '#5C4A35', cursor: 'pointer',
  },
  clearBtn: {
    height: 44, padding: '0 12px', background: 'none',
    border: '1px solid rgba(92,61,46,0.15)', borderRadius: 10,
    fontSize: 12, color: '#9A8470', cursor: 'pointer',
  },
  adjustBtn: {
    height: 44, padding: '0 12px', background: 'rgba(193,127,60,0.08)',
    border: '1px solid rgba(193,127,60,0.22)', borderRadius: 10,
    fontSize: 12, color: '#8A5A22', cursor: 'pointer',
  },
}
