// lib/compressMedia.ts
// 클라이언트 측 이미지 압축. 영상은 용량만 검사 후 signed URL 직접 업로드.

const MAX_IMAGE_BYTES = Math.floor(3.5 * 1024 * 1024)
const JPEG_QUALITIES = [0.82, 0.72, 0.62, 0.52]
const MAX_EDGE = 1920
const MIN_EDGE = 720

function unchanged(file: File, originalBytes: number) {
  return {
    file,
    originalBytes,
    compressedBytes: originalBytes,
    skipped: true as const,
  }
}

function asJpegFile(blob: Blob, source: File): File {
  const base = source.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality))
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image_load_failed'))
    }
    img.src = url
  })
}

export async function compressImage(file: File): Promise<{
  file: File
  originalBytes: number
  compressedBytes: number
  skipped: boolean
}> {
  const originalBytes = file.size
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return unchanged(file, originalBytes)
  }
  if (originalBytes <= MAX_IMAGE_BYTES && file.type === 'image/jpeg') {
    return unchanged(file, originalBytes)
  }

  try {
    const img = await loadImage(file)
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) return unchanged(file, originalBytes)

    let bestBlob: Blob | null = null
    const minDimension = Math.min(MAX_EDGE, Math.max(MIN_EDGE, Math.min(w, h)))

    for (let edge = Math.min(MAX_EDGE, Math.max(w, h)); edge >= minDimension; edge = Math.floor(edge * 0.75)) {
      const scale = Math.min(1, edge / Math.max(w, h))
      const tw = Math.max(1, Math.round(w * scale))
      const th = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) break

      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, tw, th)
      ctx.drawImage(img, 0, 0, tw, th)

      for (const quality of JPEG_QUALITIES) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        if (!blob) continue
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob
        if (blob.size <= MAX_IMAGE_BYTES) {
          if (blob.size >= originalBytes) return unchanged(file, originalBytes)
          const out = asJpegFile(blob, file)
          return {
            file: out,
            originalBytes,
            compressedBytes: out.size,
            skipped: false,
          }
        }
      }

      if (edge <= minDimension) break
    }

    if (!bestBlob || bestBlob.size >= originalBytes) return unchanged(file, originalBytes)
    const out = asJpegFile(bestBlob, file)
    return {
      file: out,
      originalBytes,
      compressedBytes: out.size,
      skipped: false,
    }
  } catch {
    return unchanged(file, originalBytes)
  }
}

const MAX_VIDEO_CLIENT = 80 * 1024 * 1024 // 80MB — Supabase 직접 업로드 (Vercel 경유 안 함)

/**
 * 업로드 전 파일 준비. 이미지는 압축 및 크기 검사, 영상은 용량만 검사.
 * 영상은 write 페이지에서 signed URL로 스토리지에 직접 올린다 (HTTP 413 방지).
 */
export async function prepareUploadFile(file: File): Promise<
  | { ok: true; file: File; note?: string; isVideo?: boolean }
  | { ok: false; error: string }
> {
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)) {
    if (file.size > MAX_VIDEO_CLIENT) {
      return {
        ok: false,
        error: `영상이 너무 커요 (${Math.round(file.size / 1024 / 1024)}MB). 80MB 이하로 줄여 주세요.`,
      }
    }
    return { ok: true, file, isVideo: true }
  }

  const result = await compressImage(file)
  if (result.file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `사진이 너무 커요 (${(result.file.size / 1024 / 1024).toFixed(1)}MB). 압축 후에도 3.5MB 이하로 줄지 않았습니다. JPG, PNG, WebP 사진을 선택해 주세요.`,
    }
  }

  const saved =
    result.skipped || result.compressedBytes >= result.originalBytes
      ? undefined
      : `${Math.round(result.originalBytes / 1024)}KB → ${Math.round(result.compressedBytes / 1024)}KB`
  return { ok: true, file: result.file, note: saved }
}
