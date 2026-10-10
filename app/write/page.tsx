'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey, ensureActorSession } from '@/lib/ownerKey'
import { getDeviceId } from '@/lib/deviceId'
import { prepareUploadFile } from '@/lib/compressMedia'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import OwnerGate from '@/components/corenull/OwnerGate'
import VideoCaptureModal from '@/components/corenull/VideoCaptureModal'

const LANG_FLAG: Record<string, string> = {
  ko: '🇰🇷', vi: '🇻🇳', en: '🇺🇸', ja: '🇯🇵', zh: '🇨🇳',
}

export default function WritePage() {
  const [content, setContent] = useState('')
  const [houses, setHouses] = useState<any[]>([])
  const [selectedHouse, setSelectedHouse] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [showCapture, setShowCapture] = useState(false)
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [isSeed, setIsSeed] = useState(false)
  const [bloomDate, setBloomDate] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [roomError, setRoomError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKey(key)
    setOwnerReady(true)
    if (!key) return

    const params = new URLSearchParams(window.location.search)
    const preselectedRoomId = params.get('room_id')
    const shouldOpenNewRoom = params.get('new_room') === '1'

    Promise.all([
      fetch(`/api/corenull/houses?owner_key=${key}`).then((r) => r.json()),
      fetch(`/api/corenull/rooms?scope=writable&owner_key=${encodeURIComponent(key)}&device_id=${encodeURIComponent(getDeviceId())}`).then((r) => r.json()),
    ]).then(([hData, rData]) => {
      const houseList = hData.data || []
      setHouses(houseList)
      const roomList = rData.data || []
      setRooms(roomList)
      if (preselectedRoomId) {
        const found = roomList.find((rm: any) => rm.id === preselectedRoomId)
        if (found) {
          setSelectedRoom(found)
          setSelectedHouse(houseList.find((h: any) => h.id === found.house_id) || houseList[0] || null)
          return
        }
      }
      if (houseList.length > 0) setSelectedHouse(houseList[0])
      setSelectedRoom(roomList.length > 0 ? roomList[0] : null)
      if (shouldOpenNewRoom) setShowNewRoom(true)
    })
  }, [])

  const loadRoomsForHouse = async (houseId: string) => {
    const key = ownerKey || getOwnerKey()
    const r = await fetch(`/api/corenull/rooms?scope=writable&owner_key=${encodeURIComponent(key)}&device_id=${encodeURIComponent(getDeviceId())}`)
    const rd = await r.json()
    const all = rd.data || []
    const filtered = all.filter((rm: any) => rm._source === 'member' || rm.house_id === houseId)
    setRooms(filtered)
    setSelectedRoom(filtered.length > 0 ? filtered[0] : null)
  }

  const handleHouseChange = async (houseId: string) => {
    const house = houses.find((h: any) => h.id === houseId)
    if (!house) return
    setSelectedHouse(house)
    setShowNewRoom(false)
    await loadRoomsForHouse(house.id)
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !selectedHouse) return
    setCreatingRoom(true)
    setRoomError('')
    await ensureActorSession()
    const res = await fetch('/api/corenull/rooms', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house_id: selectedHouse.id,
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
      const created = { ...data.data, _source: 'own', _house_title: selectedHouse?.title || null }
      setRooms((prev) => [...prev, created])
      setSelectedRoom(created)
      setShowNewRoom(false)
      setNewRoomName('')
      setIsSeed(false)
      setBloomDate('')
    } else {
      setRoomError(data._error || '방 만들기에 실패했어요')
    }
    setCreatingRoom(false)
  }

  const uploadPrepared = async (prepared: File[]) => {
    if (prepared.length === 0) return
    setUploading(true)
    setUploadLabel('업로드 중…')
    const form = new FormData()
    prepared.forEach((f) => form.append('files', f))
    await ensureActorSession()
    const res = await fetch('/api/corenull/upload', { method: 'POST', credentials: 'include', body: form })
    const data = await res.json()
    const ok = (data.data || []).filter((x: any) => x.url && !x._error)
    const failed = (data.data || []).filter((x: any) => x._error)
    if (failed.length) setSubmitError(failed[0]._error || '일부 업로드 실패')
    setMediaFiles((prev) => [...prev, ...ok])
    setUploading(false)
    setUploadLabel('')
  }

  const handleFileSelect = async (e: any) => {
    const files = Array.from(e.target.files || []) as File[]
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    setSubmitError('')
    setUploadLabel('준비 중…')
    const prepared: File[] = []
    for (let i = 0; i < files.length; i++) {
      setUploadLabel(`압축 중 ${i + 1}/${files.length}`)
      const result = await prepareUploadFile(files[i])
      if (!result.ok) {
        setSubmitError(result.error)
        continue
      }
      prepared.push(result.file)
    }
    if (prepared.length === 0) {
      setUploading(false)
      setUploadLabel('')
      return
    }
    await uploadPrepared(prepared)
  }

  const handleCapture = async (file: File) => {
    setShowCapture(false)
    setSubmitError('')
    setUploading(true)
    setUploadLabel('영상 준비 중…')
    const result = await prepareUploadFile(file)
    if (!result.ok) {
      setSubmitError(result.error)
      setUploading(false)
      setUploadLabel('')
      return
    }
    await uploadPrepared([result.file])
  }

  const handleSubmit = async () => {
    if (!content.trim() || !selectedRoom) return
    setSubmitting(true)
    setSubmitError('')
    await ensureActorSession()
    const res = await fetch('/api/corenull/posts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: selectedRoom.id,
        owner_key: ownerKey,
        content: content.trim(),
        meta: { media: mediaFiles },
        type: 'post',
      }),
    })
    const data = await res.json()
    if (data.data) {
      router.refresh()
      router.replace(`/rooms/${selectedRoom.id}`)
    } else {
      setSubmitError(data._error || '올리기에 실패했어요')
    }
    setSubmitting(false)
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index))
  }

  if (ownerReady && !ownerKey) return <OwnerGate />

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="새 이야기" />
      <div style={{ padding: 16 }}>
        {submitError && (
          <div style={{ background: 'rgba(200,60,40,0.08)', border: '1px solid rgba(200,60,40,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: '#A33' }}>
            ⚠️ {submitError}
          </div>
        )}

        {houses.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#9A8470' }}>어느 집에?</span>
            <select style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, outline: 'none' }} value={selectedHouse?.id || ''} onChange={(e) => handleHouseChange(e.target.value)}>
              {houses.map((h: any) => (
                <option key={h.id} value={h.id}>{LANG_FLAG[h.primary_language] || '🏡'} {h.title}</option>
              ))}
            </select>
          </div>
        )}

        {!showNewRoom ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#9A8470' }}>어느 방에?</span>
            <select
              style={{ flex: 1, border: 'none', background: 'none', fontSize: 14, outline: 'none' }}
              value={selectedRoom?.id || ''}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewRoom(true)
                  return
                }
                setSelectedRoom(rooms.find((r: any) => r.id === e.target.value))
              }}
            >
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r._source === 'member' ? `참여 · ${r._house_title ? r._house_title + ' · ' : ''}${r.room_name}` : r.room_name}
                  {r.seed_mode ? ' 🌱' : ''}
                </option>
              ))}
              <option value="__new__">+ 새 방 만들기</option>
            </select>
          </div>
        ) : (
          <div style={{ background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#9A8470' }}>새 방 만들기</span>
              <button type="button" style={{ fontSize: 13, color: '#9A8470', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setShowNewRoom(false); setNewRoomName(''); setIsSeed(false); setBloomDate(''); setRoomError('') }}>취소</button>
            </div>
            {roomError && <div style={{ color: '#A33', fontSize: 13 }}>⚠️ {roomError}</div>}
            <input style={{ height: 44, background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 10, padding: '0 12px', fontSize: 14 }} placeholder="방 이름" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} maxLength={20} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F5F0E8', borderRadius: 10, cursor: 'pointer' }} onClick={() => setIsSeed((v) => !v)}>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>🌱 씨앗</div><div style={{ fontSize: 11, color: '#9A8470' }}>스스로에게 한 약속</div></div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: isSeed ? '#2C1810' : '#e0d8d0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transform: isSeed ? 'translateX(20px)' : 'translateX(2px)' }} />
              </div>
            </div>
            {isSeed && (
              <input type="date" style={{ height: 40, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 8, padding: '0 12px' }} value={bloomDate} min={today} onChange={(e) => setBloomDate(e.target.value)} />
            )}
            <button type="button" style={{ padding: 12, background: '#2C1810', color: 'white', border: 'none', borderRadius: 10, opacity: !newRoomName.trim() || creatingRoom ? 0.4 : 1 }} onClick={handleCreateRoom} disabled={!newRoomName.trim() || creatingRoom}>
              {creatingRoom ? '만드는 중...' : '방 만들기'}
            </button>
          </div>
        )}

        <textarea
          style={{ width: '100%', minHeight: 200, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.7, resize: 'none', outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
          placeholder="오늘 어떤 순간을 남기고 싶으세요?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus={!showNewRoom}
        />

        {mediaFiles.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {mediaFiles.map((m, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {m.type === 'image' ? <img src={m.url} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} /> : <div style={{ width: 80, height: 80, borderRadius: 10, background: '#2d4a3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🎬</div>}
                <button type="button" style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#2C1810', color: 'white', border: 'none', fontSize: 10, cursor: 'pointer' }} onClick={() => removeMedia(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" style={{ flex: 1, height: 48, background: '#FEFCF8', border: '1px dashed rgba(92,61,46,0.2)', borderRadius: 12, fontSize: 14, color: '#9A8470', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? '⏳' : '📷'} {uploading ? uploadLabel || '업로드 중...' : '사진/영상'}
          </button>
          <button type="button" style={{ flex: 1, height: 48, background: '#2C1810', border: 'none', borderRadius: 12, fontSize: 14, color: '#FEFCF8', cursor: 'pointer', fontWeight: 500 }} onClick={() => setShowCapture(true)} disabled={uploading}>🎥 촬영</button>
        </div>

        <button
          type="button"
          style={{ width: '100%', padding: '12px 16px', background: '#2C1810', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: !content.trim() || !selectedRoom || submitting ? 0.4 : 1 }}
          onClick={handleSubmit}
          disabled={!content.trim() || !selectedRoom || submitting}
        >
          {submitting ? '올리는 중...' : '올리기'}
        </button>

        <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
      </div>

      {showCapture && <VideoCaptureModal onClose={() => setShowCapture(false)} onCapture={handleCapture} />}
    </div>
  )
}
