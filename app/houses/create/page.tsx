'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOwnerKey } from '@/hooks/useOwnerKey'

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
  const ownerKey = useOwnerKey()

  const handleSubmit = async () => {
    if (!title.trim() || !ownerKey) return
    setSubmitting(true)

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
    if (data.data) {
      router.push(`/houses/${data.data.id}`)
    }
    setSubmitting(false)
  }