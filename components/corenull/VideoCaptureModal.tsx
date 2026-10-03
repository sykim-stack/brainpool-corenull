'use client'

import { useEffect, useRef, useState } from 'react'

/** 짧은 순간 — 틱톡/페북처럼 인앱에서 바로 찍기 */
const MAX_SECONDS = 15

export interface VideoCaptureModalProps {
  onClose: () => void
  /** 촬영 완료 파일 (webm 또는 mp4) */
  onCapture: (file: File) => void
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

export default function VideoCaptureModal({ onClose, onCapture }: VideoCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [ready, setReady] = useState(false)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const [mimeType, setMimeType] = useState<string | undefined>(undefined)

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

  const startCamera = async (face: 'user' | 'environment') => {
    setError('')
    setReady(false)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: face },
          width: { ideal: 720 },
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
        setError('카메라·마이크 권한을 허용해 주세요.')
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
    if (typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 영상 녹화를 지원하지 않아요.')
      return
    }
    startCamera(facing)
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

  const flipCamera = async () => {
    if (recording) return
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    await startCamera(next)
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
    <div style={styles.backdrop} role="dialog" aria-label="영상 촬영">
      <div style={styles.sheet}>
        <div style={styles.head}>
          <span style={styles.headTitle}>짧은 영상</span>
          <button type="button" style={styles.close} onClick={handleClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <p style={styles.hint}>최대 {MAX_SECONDS}초 · 바로 찍어서 올려요</p>

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

          {!recording ? (
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
    zIndex: 90,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    background: '#1C1208',
    borderRadius: '16px 16px 0 0',
    padding: '14px 14px 28px',
    color: '#FEFCF8',
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
    padding: '0 12px',
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
