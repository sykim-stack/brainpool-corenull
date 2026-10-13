'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

  const [mounted, setMounted] = useState(false)
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
    setMounted(true)
    setMimeType(pickMimeType())
    startCamera(facing)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop()
        } catch {
          /* ignore */
        }
      }
      stopStream()
      document.body.style.overflow = prevOverflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const switchCamera = () => {
    if (recording) return
    const next = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    startCamera(next)
  }

  const stopRecording = () => {
    clearTimer()
    setRecording(false)
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
    }
  }

  const startRecording = () => {
    const stream = streamRef.current
    if (!stream || !ready) return
    if (typeof MediaRecorder === 'undefined') {
      setError('이 브라우저는 영상 녹화를 지원하지 않아요.')
      return
    }
    chunksRef.current = []
    setSeconds(0)
    setError('')

    let rec: MediaRecorder
    try {
      rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
    } catch {
      try {
        rec = new MediaRecorder(stream)
      } catch {
        setError('녹화를 시작할 수 없어요.')
        return
      }
    }

    recorderRef.current = rec
    rec.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
    }
    rec.onstop = () => {
      clearTimer()
      setRecording(false)
      const type = rec.mimeType || mimeType || 'video/webm'
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
    rec.onerror = () => {
      setError('녹화 중 오류가 났어요.')
      clearTimer()
      setRecording(false)
    }

    rec.start(200)
    setRecording(true)
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) {
          stopRecording()
          return MAX_SECONDS
        }
        return s + 1
      })
    }, 1000)
  }

  const handleClose = () => {
    clearTimer()
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    stopStream()
    onClose()
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const ui = (
    <div style={styles.root} role="dialog" aria-modal="true" aria-label="영상 촬영">
      <video
        ref={videoRef}
        style={{
          ...styles.video,
          transform: facing === 'user' ? 'scaleX(-1)' : 'none',
        }}
        playsInline
        muted
        autoPlay
      />

      {!ready && !error && <div style={styles.overlay}>카메라 준비 중…</div>}

      {recording && (
        <div style={styles.recBadge}>
          <span style={styles.recDot} />
          {mm}:{ss} / 00:{String(MAX_SECONDS).padStart(2, '0')}
        </div>
      )}

      <div style={styles.topBar}>
        <button type="button" style={styles.close} onClick={handleClose}>
          닫기
        </button>
        <div style={styles.title}>짧은 영상 · 최대 {MAX_SECONDS}초</div>
        <div style={{ width: 48 }} />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.controls}>
        <button
          type="button"
          style={styles.sideBtn}
          onClick={switchCamera}
          disabled={recording || !ready}
          aria-label="카메라 전환"
        >
          🔄
        </button>

        {!recording ? (
          <button
            type="button"
            style={styles.shutter}
            onClick={startRecording}
            disabled={!ready}
            aria-label="녹화 시작"
          >
            <span style={styles.shutterInner} />
          </button>
        ) : (
          <button
            type="button"
            style={styles.shutterStop}
            onClick={stopRecording}
            aria-label="녹화 종료"
          >
            <span style={styles.shutterStopInner} />
          </button>
        )}

        <div style={styles.sideBtnPlaceholder} />
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(ui, document.body)
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 'env(safe-area-inset-top, 0px)',
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)',
    fontSize: 14,
    color: 'rgba(254,252,248,0.85)',
    zIndex: 1,
  },
  topBar: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#FEFCF8',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  close: {
    border: 'none',
    background: 'rgba(0,0,0,0.35)',
    color: '#FEFCF8',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 999,
  },
  recBadge: {
    position: 'absolute',
    top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#FEFCF8',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#E24',
    boxShadow: '0 0 0 2px rgba(238,34,68,0.35)',
  },
  error: {
    position: 'relative',
    zIndex: 2,
    margin: '0 16px',
    background: 'rgba(200,60,40,0.85)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    color: '#fff',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding:
      '16px 28px calc(24px + env(safe-area-inset-bottom, 0px) + 64px)',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '1px solid rgba(254,252,248,0.25)',
    background: 'rgba(0,0,0,0.35)',
    fontSize: 20,
    cursor: 'pointer',
  },
  sideBtnPlaceholder: { width: 48, height: 48 },
  shutter: {
    width: 76,
    height: 76,
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
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#E24',
  },
  shutterStop: {
    width: 76,
    height: 76,
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
    width: 30,
    height: 30,
    borderRadius: 6,
    background: '#E24',
  },
}
