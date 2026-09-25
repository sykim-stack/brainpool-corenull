'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDeviceId } from '@/lib/deviceId'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'

// House 이미지 등록 — /write 업로드 파이프라인 재사용.
// 새 업로드 API 없음. Poster 구현 전 House View 표면만 채운다.

type SlotKey = 'avatar_url' | 'yard_image_url' | 'living_image_url'

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: 'avatar_url', label: '프로필', hint: 'Ring · 이웃 프로필' },
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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const key = getDeviceId()
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
    setMsg('')
    try {
      const form = new FormData()
      form.append('files', file)
      const up = await fetch('/api/corenull/upload', { method: 'POST', body: form })
      const upData = await up.json()
      const item = upData.data?.[0]
      if (!item?.url || item._error) {
        setMsg(item?._error || upData._error || '업로드 실패')
        setUploading(false)
        return
      }

      setSaving(true)
      const res = await fetch('/api/corenull/houses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          house_id: house.id,
          owner_key: ownerKey,
          [activeSlot]: item.url,
        }),
      })
      const data = await res.json()
      if (data.data) {
        setHouse(data.data)
        setMsg('저장됐어요')
      } else {
        setMsg(data._error || '저장 실패 — DB 마이그레이션 확인')
      }
    } catch {
      setMsg('네트워크 오류')
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
      body: JSON.stringify({
        house_id: house.id,
        owner_key: ownerKey,
        [key]: null,
      }),
    })
    const data = await res.json()
    if (data.data) {
      setHouse(data.data)
      setMsg('기본으로 되돌렸어요')
    } else {
      setMsg(data._error || '삭제 실패')
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={styles.loading}>🏡</div>
  }

  if (!house) {
    return (
      <div>
        <TopBar logo={<CoreNullLogo size="sm" />} title="집 이미지" />
        <div style={styles.empty}>
          <p>아직 집이 없어요</p>
          <button style={styles.primaryBtn} onClick={() => router.push('/houses/create')}>
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
          {house.title}
          <br />
          <span style={styles.leadSub}>글쓰기와 같은 업로드를 씁니다. 없으면 기본 배경이 보입니다.</span>
        </p>

        {msg && <div style={styles.msg}>{msg}</div>}

        {SLOTS.map((slot) => {
          const url = house[slot.key] as string | null
          return (
            <div key={slot.key} style={styles.card}>
              <div style={styles.cardHead}>
                <div>
                  <div style={styles.cardTitle}>{slot.label}</div>
                  <div style={styles.cardHint}>{slot.hint}</div>
                </div>
              </div>
              <div
                style={{
                  ...styles.preview,
                  backgroundImage: url ? `url(${url})` : undefined,
                  background: url
                    ? undefined
                    : slot.key === 'living_image_url'
                      ? 'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)'
                      : 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
                }}
              >
                {!url && (
                  <span style={styles.previewEmpty}>
                    {slot.key === 'avatar_url' ? '🏡 기본' : '기본 배경'}
                  </span>
                )}
              </div>
              <div style={styles.actions}>
                <button
                  style={styles.mediaBtn}
                  disabled={uploading || saving}
                  onClick={() => pickSlot(slot.key)}
                >
                  {uploading && activeSlot === slot.key ? '업로드 중…' : url ? '📷 바꾸기' : '📷 올리기'}
                </button>
                {url && (
                  <button
                    style={styles.clearBtn}
                    disabled={uploading || saving}
                    onClick={() => clearSlot(slot.key)}
                  >
                    기본으로
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
}
