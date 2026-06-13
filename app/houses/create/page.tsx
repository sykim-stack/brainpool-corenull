'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { getDeviceId } from '@/lib/deviceId'

const LANGUAGES = [
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'vi', flag: '🇻🇳', label: '베트남어' },
  { code: 'en', flag: '🇺🇸', label: '영어' },
  { code: 'ja', flag: '🇯🇵', label: '일본어' },
  { code: 'zh', flag: '🇨🇳', label: '중국어' },
]

export default function CreateHousePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('ko')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const OWNER_KEY = getDeviceId()

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)

    const res = await fetch('/api/corenull/houses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_key: OWNER_KEY,
        title: title.trim(),
        description: description.trim() || null,
        primary_language: language,
      }),
    })

    const data = await res.json()
    if (data.data) {
      router.push(`/houses/${data.data.id}`)
    }
    setSubmitting(false)
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => router.back()}>←</button>
        <span style={styles.headerTitle}>집 만들기</span>
        <button
          style={{ ...styles.submitBtn, opacity: (!title.trim() || submitting) ? 0.4 : 1 }}
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
        >
          {submitting ? '...' : '완성'}
        </button>
      </div>

      <div style={styles.body}>
        {/* 집 미리보기 */}
        <div style={styles.preview}>
          <div style={styles.previewCover}>
            <span style={styles.previewEmoji}>🏡</span>
            <div>
              <div style={styles.previewTitle}>{title || '집 이름'}</div>
              <div style={styles.previewLang}>
                {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.label}
              </div>
            </div>
          </div>
        </div>

        {/* 집 이름 */}
        <div style={styles.fieldLabel}>집 이름 *</div>
        <input
          style={styles.input}
          placeholder="우리 가족 집"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={30}
          autoFocus
        />

        {/* 소개 */}
        <div style={styles.fieldLabel}>소개 (선택)</div>
        <textarea
          style={styles.textarea}
          placeholder="이 집은 어떤 공간인가요?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={100}
        />

        {/* 언어 선택 */}
        <div style={styles.fieldLabel}>이 집의 언어</div>
        <div style={styles.fieldDesc}>이 집에서 쓰는 주요 언어예요. 방문자에게는 자동으로 번역돼요.</div>
        <div style={styles.langGrid}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              style={{
                ...styles.langBtn,
                ...(language === lang.code ? styles.langBtnActive : {}),
              }}
              onClick={() => setLanguage(lang.code)}
            >
              <span style={{ fontSize: 24 }}>{lang.flag}</span>
              <span style={styles.langLabel}>{lang.label}</span>
            </button>
          ))}
        </div>

        {/* 안내 */}
        <div style={styles.notice}>
          🌱 집을 만들면 기본 방 "일상"이 자동으로 생겨요.
        </div>
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
  preview: {
    marginBottom: 20, borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  previewCover: {
    height: 100,
    background: 'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)',
    display: 'flex', alignItems: 'flex-end', padding: '14px 16px', gap: 10,
  },
  previewEmoji: { fontSize: 32 },
  previewTitle: {
    fontFamily: "'Noto Serif KR', serif", fontSize: 16, fontWeight: 600,
    color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  previewLang: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: 500, color: '#5C4A35', marginBottom: 6, marginTop: 16 },
  fieldDesc: { fontSize: 12, color: '#9A8470', marginBottom: 10, lineHeight: 1.5 },
  input: {
    width: '100%', height: 48,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: '0 14px',
    fontFamily: "'Noto Sans KR', sans-serif", fontSize: 15, color: '#1C1208',
    outline: 'none', boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', height: 80,
    background: '#FEFCF8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, padding: '12px 14px',
    fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, color: '#1C1208',
    outline: 'none', resize: 'none', boxSizing: 'border-box',
  },
  langGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
  },
  langBtn: {
    padding: '12px 8px', background: '#FEFCF8',
    border: '1px solid rgba(92,61,46,0.12)', borderRadius: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  langBtnActive: {
    background: 'rgba(44,24,16,0.06)', border: '1.5px solid #2C1810',
  },
  langLabel: { fontSize: 12, color: '#1C1208' },
  notice: {
    marginTop: 20, padding: '12px 14px',
    background: 'rgba(74,82,64,0.08)', borderRadius: 12,
    fontSize: 13, color: '#5C4A35', lineHeight: 1.5,
  },
}