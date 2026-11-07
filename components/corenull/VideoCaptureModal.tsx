'use client'

import { useEffect, useRef, useState } from 'react'

/** 짧은 순간 — 인앱에서 사진 또는 영상 바로 찍기 */
const MAX_SECONDS = 15

export interface VideoCaptureModalProps {
  onClose: () => void
  /** 촬영 완료 파일 (image/jpeg 또는 video webm/mp4) */
  onCapture: (file: File) => void
  /** 기본 모드 */
  initialMode?: 'photo' | 'video'
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return undefined
}

export default function VideoCaptureModal({
  onClose,
  onCapture,
  initialMode = 'photo',
}: VideoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mode, setMode] = useState<'photo' | 'video'>(initialMode)
  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [mimeType, setMimeType] = useState<string | undefined>(undefined)
  const [snapping, setSnapping] = useState(false)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startCamera = async (face: 'user' | 'environment', forMode: 'photo' | 'video') => {
    setError('')
    setReady(false)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: forMode === 'video',
        video: {
          facingMode: { ideal: face },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setReady(true)
    } catch (e: any) {
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError(
          forMode === 'video'
            ? '카메라·마이크 권한을 허용해 주세요.'
            : '카메라 권한을 허용해 주세요.',
        )
      } else if (name === 'NotFoundError') {
        setError('카메라를 찾을 수 없어요.')
      } else {
        setError('카메라를 열 수 없어요. HTTPS 환경인지 확인해 주세요.')
      }
      setReady(false)
    }
  }

  useEffect(() => {
    const mime = pickMimeType()
    setMimeType(mime)
    if (typeof window === 'undefined') return
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 카메라 촬영을 지원하지 않아요.')
      return
    }
    startCamera(facing, mode)
    return () => {
      clearTimer()
      try {
        recorderRef.current?.stop()
      } catch {
        /* ignore */
      }
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchMode = async (next: 'photo' | 'video') => {
    if (recording || next === mode) return
    if (next === 'video' && typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 영상 녹화를 지원하지 않아요.')
      return
    }
    setMode(next)
    setError('')
    await startCamera(facing, next)
  }

  const flipCamera = async () => {
    if (recording) return
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    await startCamera(next, mode)
  }

  const takePhoto = async () => {
    if (!ready || snapping || recording) return
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      setError('카메라가 아직 준비되지 않았어요.')
      return
    }
    setSnapping(true)
    setError('')
    try {
      const w = video.videoWidth
      const h = video.videoHeight
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')
      ctx.drawImage(video, 0, 0, w, h)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
      )
      if (!blob || blob.size < 500) {
        setError('사진을 저장하지 못했어요. 다시 찍어 주세요.')
        return
      }
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      stopStream()
      onCapture(file)
    } catch {
      setError('사진 촬영에 실패했어요.')
    } finally {
      setSnapping(false)
    }
  }

  const finishRecording = () => {
    clearTimer()
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') {
      setRecording(false)
      return
    }
    rec.onstop = () => {
      setRecording(false)
      const type = mimeType?.split(';')[0] || 'video/webm'
      const blob = new Blob(chunksRef.current, { type })
      chunksRef.current = []
      if (blob.size < 1000) {
        setError('녹화된 영상이 너무 짧아요. 다시 찍어 주세요.')
        return
      }
      const ext = type.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([blob], `capture-${Date.now()}.${ext}`, { type })
      stopStream()
      onCapture(file)
    }
    try {
      rec.stop()
    } catch {
      setRecording(false)
    }
  }

  const startRecording = () => {
    if (!streamRef.current || recording) return
    if (typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 영상 녹화를 지원하지 않아요.')
      return
    }
    setError('')
    chunksRef.current = []
    setSeconds(0)

    let rec: MediaRecorder
    try {
      rec = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 1_500_000 })
        : new MediaRecorder(streamRef.current, { videoBitsPerSecond: 1_500_000 })
    } catch {
      try {
        rec = new MediaRecorder(streamRef.current)
      } catch {
        setError('이 기기에서 녹화를 시작할 수 없어요.')
        return
      }
    }

    recorderRef.current = rec
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
    }
    rec.start(200)
    setRecording(true)

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1
        if (next >= MAX_SECONDS) {
          finishRecording()
        }
        return next
      })
    }, 1000)
  }

  const handleClose = () => {
    clearTimer()
    try {
      recorderRef.current?.stop()
    } catch {
      /* ignore */
    }
    stopStream()
    onClose()
  }

  const remain = Math.max(0, MAX_SECONDS - seconds)

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.sheet}>
        <div style={styles.head}>
          <span style={styles.headTitle}>{mode === 'photo' ? '사진 촬영' : '짧은 영상'}</span>
          <button type="button" style={styles.close} onClick={handleClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div style={styles.modeRow}>
          <button
            type="button"
            style={{
              ...styles.modeBtn,
              ...(mode === 'photo' ? styles.modeBtnOn : {}),
            }}
            disabled={recording}
            onClick={() => switchMode('photo')}
          >
            사진
          </button>
          <button
            type="button"
            style={{
              ...styles.modeBtn,
              ...(mode === 'video' ? styles.modeBtnOn : {}),
            }}
            disabled={recording}
            onClick={() => switchMode('video')}
          >
            영상
          </button>
        </div>

        <p style={styles.hint}>
          {mode === 'photo'
            ? '셔터를 누르면 바로 첨부돼요'
            : `최대 ${MAX_SECONDS}초 · 바로 찍어서 올려요`}
        </p>

        <div style={styles.stage}>
          <video
            ref={videoRef}
            style={styles.video}
            playsInline
            muted
            autoPlay
          />
          {recording && (
            <div style={styles.recBadge}>
              <span style={styles.recDot} />
              {remain}s
            </div>
          )}
          {!ready && !error && <div style={styles.overlay}>카메라 준비 중…</div>}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.controls}>
          <button
            type="button"
            style={styles.sideBtn}
            onClick={flipCamera}
            disabled={recording || !ready}
            aria-label="카메라 전환"
          >
            🔄
          </button>

          {mode === 'photo' ? (
            <button
              type="button"
              style={{
                ...styles.shutter,
                opacity: ready && !snapping ? 1 : 0.4,
              }}
              disabled={!ready || snapping}
              onClick={takePhoto}
              aria-label="사진 촬영"
            >
              <span style={styles.shutterPhotoInner} />
            </button>
          ) : !recording ? (
            <button
              type="button"
              style={{
                ...styles.shutter,
                opacity: ready ? 1 : 0.4,
              }}
              disabled={!ready}
              onClick={startRecording}
              aria-label="녹화 시작"
            >
              <span style={styles.shutterInner} />
            </button>
          ) : (
            <button
              type="button"
              style={styles.shutterStop}
              onClick={finishRecording}
              aria-label="녹화 종료"
            >
              <span style={styles.shutterStopInner} />
            </button>
          )}

          <div style={styles.sideBtnPlaceholder} />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(28,18,8,0.55)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    background: '#1C1208',
    borderRadius: '16px 16px 0 0',
    padding: '14px 14px calc(28px + env(safe-area-inset-bottom, 0px))',
    color: '#FEFCF8',
    maxHeight: '92vh',
    overflowY: 'auto',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headTitle: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: 16,
    fontWeight: 600,
  },
  close: {
    border: 'none',
    background: 'none',
    color: 'rgba(254,252,248,0.7)',
    fontSize: 16,
    cursor: 'pointer',
    padding: 4,
  },
  modeRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  modeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    border: '1px solid rgba(254,252,248,0.18)',
    background: 'transparent',
    color: 'rgba(254,252,248,0.65)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  modeBtnOn: {
    background: 'rgba(245,197,24,0.18)',
    border: '1px solid rgba(245,197,24,0.55)',
    color: '#F5C518',
    fontWeight: 600,
  },
  hint: {
    margin: '0 0 10px',
    fontSize: 12,
    color: 'rgba(254,252,248,0.55)',
  },
  stage: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3 / 4',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#000',
    maxHeight: '48vh',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(1)',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)',
    fontSize: 13,
    color: 'rgba(254,252,248,0.8)',
  },
  recBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 13,
    fontWeight: 600,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#E24',
    boxShadow: '0 0 0 2px rgba(238,34,68,0.35)',
  },
  error: {
    marginTop: 10,
    background: 'rgba(200,60,40,0.2)',
    border: '1px solid rgba(200,60,40,0.35)',
    borderRadius: 10,
    padding: '8px 10px',
    fontSize: 12,
    color: '#fcc',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    padding: '0 12px 8px',
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '1px solid rgba(254,252,248,0.2)',
    background: 'rgba(254,252,248,0.08)',
    fontSize: 18,
    cursor: 'pointer',
  },
  sideBtnPlaceholder: { width: 44, height: 44 },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '3px solid #FEFCF8',
    background: 'transparent',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#E24',
  },
  shutterPhotoInner: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: '#FEFCF8',
  },
  shutterStop: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '3px solid #FEFCF8',
    background: 'transparent',
    padding: 4,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterStopInner: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#E24',
  },
}
