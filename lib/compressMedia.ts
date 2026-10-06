// lib/compressMedia.ts
// 업로드 전 클라이언트 압축 — 원본 휴대폰 사진을 그대로 서버에 보내지 않는다.
// Vercel 요청 한도(4.5MB)와 multipart 오버헤드를 고려해 이미지 결과를 3.5MB 이하로 맞춘다.

const MAX_EDGE = 1600
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024
const JPEG_QUALITIES = [0.82, 0.74, 0.66, 0.58]
const SKIP_IF_UNDER = 200 * 1024 // 작은 파일은 불필요한 재인코딩 생략

export type CompressResult = {
  file: File
  originalBytes: number
  compressedBytes: number
  skipped: boolean
}

function unchanged(file: File, originalBytes: number): CompressResult {
  return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
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

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function asJpegFile(blob: Blob, source: File): File {
  const base = source.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${base}.jpg`, {
    type: 'image/jpeg',
    lastModified: source.lastModified || Date.now(),
  })
}

/**
 * 이미지를 긴 변 MAX_EDGE 이하로 줄이고 JPEG로 재인코딩한다.
 * 3.5MB가 넘으면 품질과 해상도를 단계적으로 낮춘다.
 * 애니메이션 GIF는 보존을 위해 재인코딩하지 않는다.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size

  if (!file.type.startsWith('image/') && file.type !== '') {
    return unchanged(file, originalBytes)
  }

  // GIF는 애니메이션 보존 — 건드리지 않음. prepareUploadFile에서 크기 초과를 거절한다.
  if (file.type === 'image/gif') {
    return unchanged(file, originalBytes)
  }

  if (originalBytes <= SKIP_IF_UNDER) {
    return unchanged(file, originalBytes)
  }

  try {
    const img = await loadImage(file)
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) return unchanged(file, originalBytes)

    const firstDimension = Math.min(MAX_EDGE, Math.max(w, h))
    const minDimension = Math.min(firstDimension, 640, Math.max(320, Math.round(firstDimension * 0.5)))
    let bestBlob: Blob | null = null

    for (let edge = firstDimension; ; edge = Math.max(minDimension, Math.floor(edge * 0.85))) {
      const scale = Math.min(1, edge / Math.max(w, h))
      const tw = Math.max(1, Math.round(w * scale))
      const th = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = tw
      canvas.height = th
      const ctx = canvas.getContext('2d')
      if (!ctx) break

      // JPEG has no alpha channel; retain transparent PNG pixels on white instead of black.
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
    // Decoder/canvas failure falls back to original; prepareUploadFile enforces the safe size limit.
    return unchanged(file, originalBytes)
  }
}

const MAX_VIDEO_CLIENT = 20 * 1024 * 1024 // 20MB — 클라이언트 경고/거절

/**
 * 업로드 전 파일 준비. 이미지는 압축 및 크기 검사, 영상은 용량만 검사.
 */
export async function prepareUploadFile(file: File): Promise<
  | { ok: true; file: File; note?: string }
  | { ok: false; error: string }
> {
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)) {
    if (file.size > MAX_VIDEO_CLIENT) {
      return {
        ok: false,
        error: `영상이 너무 커요 (${Math.round(file.size / 1024 / 1024)}MB). 20MB 이하로 줄여 주세요.`,
      }
    }
    return { ok: true, file }
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
