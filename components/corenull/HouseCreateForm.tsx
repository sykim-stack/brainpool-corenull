'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOwnerKey } from '@/hooks/useOwnerKey'
import { setActiveHouseId } from '@/lib/activeHouse'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'

const LANGUAGES = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'vi', flag: '🇻🇳', label: '베트남어' },
  { code: 'en', flag: '🇺🇸', label: '영어' },
  { code: 'ja', flag: '🇯🇵', label: '일본어' },
  { code: 'zh', flag: '🇨🇳', label: '중국어' },
]

type HouseCreateFormProps = {
  variant?: 'page' | 'modal'
  ownerKey?: string
  onClose?: () => void
}

export default function HouseCreateForm({
  variant = 'page',
  ownerKey: ownerKeyProp,
  onClose,
}: HouseCreateFormProps) {
  const hookOwnerKey = useOwnerKey()
  const ownerKey = ownerKeyProp ?? hookOwnerKey
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('ko')
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(variant === 'modal' && !!ownerKeyProp)
  const [existingCount, setExistingCount] = useState(0)
  const [error, setError] = useState('')
  const isModal = variant === 'modal'

  useEffect(() => {
    if (isModal) {
      setReady(true)
      return
    }
    if (!ownerKey) {
      setReady(true)
      return
    }
    let cancelled = false
    fetch(`/api/corenull/houses?owner_key=${encodeURIComponent(ownerKey)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data._error) setError('집 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
        else setExistingCount((data.data || []).length)
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setError('집 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [isModal, ownerKey])

  useEffect(() => {
    if (!isModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isModal, onClose])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !ownerKey || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/corenull/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_key: ownerKey,
          title: title.trim(),
          description: description.trim() || null,
          primary_language: language,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.data?.id) {
        setError(data._error || '집을 만들지 못했어요. 다시 시도해 주세요.')
        return
      }
      setActiveHouseId(data.data.id)
      router.push('/yard')
    } catch {
      setError('네트워크 오류가 발생했어요. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const content = (
    <form style={styles.body} onSubmit={handleSubmit}>
      <div style={styles.preview}>
        <div style={styles.previewCover}>
          <span style={styles.previewEmoji}>🏡</span>
          <div>
            <div style={styles.previewTitle}>{title || '집 이름'}</div>
            <div style={styles.previewLang}>
              {LANGUAGES.find((l) => l.code === language)?.flag}{' '}
              {LANGUAGES.find((l) => l.code === language)?.label}
            </div>
          </div>
        </div>
      </div>

      {existingCount > 0 && (
        <div style={styles.multiHint}>
          이미 {existingCount}채가 있어요. 새 집은 마당에서 바로 전환할 수 있어요.
        </div>
      )}
      {error && <div role="alert" style={styles.error}>{error}</div>}

      <label htmlFor="house-title" style={styles.fieldLabel}>집 이름 *</label>
      <input
        id="house-title"
        style={styles.input}
        placeholder="우리 가족 집"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={30}
        autoFocus
        required
      />

      <label htmlFor="house-description" style={styles.fieldLabel}>소개 (선택)</label>
      <textarea
        id="house-description"
        style={styles.textarea}
        placeholder="이 집은 어떤 공간인가요?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={100}
      />

      <div style={styles.fieldLabel}>이 집의 언어</div>
      <div style={styles.fieldDesc}>이 집에서 쓰는 주요 언어예요. 방문자에게는 자동으로 번역돼요.</div>
      <div style={styles.langGrid}>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            aria-pressed={language === lang.code}
            style={{ ...styles.langBtn, ...(language === lang.code ? styles.langBtnActive : {}) }}
            onClick={() => setLanguage(lang.code)}
          >
            <span style={{ fontSize: 24 }}>{lang.flag}</span>
            <span style={styles.langLabel}>{lang.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.notice}>
        🌱 집을 만들면 기본 방 "일상"이 자동으로 생겨요. 한 Owner가 여러 집을 가질 수 있어요.
      </div>

      <button
        type="submit"
        style={{ ...styles.submitBtn, opacity: !title.trim() || !ownerKey || submitting ? 0.4 : 1 }}
        disabled={!title.trim() || !ownerKey || submitting}
      >
        {submitting ? '만드는 중…' : '완성'}
      </button>
    </form>
  )

  if (!ready) return <div style={styles.loading}>🏡</div>

  if (isModal) {
    return (
      <div style={styles.backdrop} onClick={onClose} role="presentation">
        <section
          style={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-house-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header style={styles.dialogHeader}>
            <h2 id="create-house-title" style={styles.dialogTitle}>우리 집 만들기</h2>
            {onClose && (
              <button type="button" style={styles.close} onClick={onClose} aria-label="닫기">✕</button>
            )}
          </header>
          {content}
        </section>
      </div>
    )
  }

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="집 만들기" />
      {content}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 100, padding: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(28,18,8,0.42)', boxSizing: 'border-box',
  },
  dialog: {
    width: '100%', maxWidth: 460, maxHeight: 'min(92dvh, 760px)', overflowY: 'auto',
    borderRadius: 20, background: '#FEFCF8', padding: 20,
    boxShadow: '0 18px 60px rgba(28,18,8,0.24)', boxSizing: 'border-box',
  },
  dialogHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  dialogTitle: { margin: 0, fontFamily: "'Noto Serif KR', serif", fontSize: 19, color: '#2C1810' },
  close: { border: 0, background: 'none', color: '#9A8470', cursor: 'pointer', fontSize: 18, padding: 6 },
  body: { padding: '8px 0 0' },
  preview: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 20px rgba(44,24,16,0.08)' },
  previewCover: {
    height: 84, background: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
    display: 'flex', alignItems: 'flex-end', padding: '12px 14px', gap: 10, boxSizing: 'border-box',
  },
  previewEmoji: { fontSize: 30 },
  previewTitle: { fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' },
  previewLang: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  multiHint: { marginBottom: 8, padding: '10px 12px', background: 'rgba(193,127,60,0.08)', borderRadius: 10, fontSize: 12, color: '#8A5A22', lineHeight: 1.45 },
  error: { marginBottom: 10, padding: '10px 12px', background: 'rgba(160,40,32,0.08)', borderRadius: 10, color: '#96392E', fontSize: 12 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 500, color: '#5C4A35', marginBottom: 6, marginTop: 14 },
  fieldDesc: { fontSize: 12, color: '#9A8470', marginBottom: 10, lineHeight: 1.5 },
  input: { width: '100%', height: 46, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: '0 14px', fontFamily: "'Noto Sans KR', sans-serif", fontSize: 15, color: '#1C1208', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', height: 70, background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, padding: '12px 14px', fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: '#1C1208', outline: 'none', resize: 'none', boxSizing: 'border-box' },
  langGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 },
  langBtn: { minWidth: 0, padding: '9px 4px', background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' },
  langBtnActive: { background: 'rgba(44,24,16,0.06)', border: '1.5px solid #2C1810' },
  langLabel: { fontSize: 10, color: '#1C1208', whiteSpace: 'nowrap' },
  notice: { marginTop: 14, padding: '10px 12px', background: 'rgba(74,82,64,0.08)', borderRadius: 12, fontSize: 12, color: '#5C4A35', lineHeight: 1.5 },
  submitBtn: { width: '100%', padding: '12px 16px', background: '#2C1810', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
}
