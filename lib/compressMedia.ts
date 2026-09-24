// lib/compressMedia.ts
// 업로드 전 클라이언트 압축 — 원본 휴대폰 사진을 그대로 올리지 않는다.
// 서버는 중계만 하므로 용량·시간을 여기서 줄인다.

const MAX_EDGE = 1600
const JPEG_QUALITY = 0.82
const SKIP_IF_UNDER = 400 * 1024 // 이미 작으면 재인코딩 생략

export type CompressResult = {
  file: File
  originalBytes: number
  compressedBytes: number
  skipped: boolean
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
    canvas.toBlob((b) => resolve(b), type, quality)
  })
}

/**
 * 이미지를 긴 변 MAX_EDGE 이하로 줄이고 JPEG로 재인코딩한다.
 * 실패하거나 이미 작으면 원본 File을 그대로 반환한다.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  const originalBytes = file.size

  if (!file.type.startsWith('image/') && file.type !== '') {
    return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
  }

  // GIF는 애니메이션 보존 — 건드리지 않음
  if (file.type === 'image/gif') {
    return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
  }

  if (originalBytes <= SKIP_IF_UNDER) {
    return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
  }

  try {
    const img = await loadImage(file)
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) {
      return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
    }
    ctx.drawImage(img, 0, 0, tw, th)

    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    if (!blob || blob.size >= originalBytes) {
      // 압축이 더 커지면 원본 유지
      return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'image'
    const out = new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
    return {
      file: out,
      originalBytes,
      compressedBytes: out.size,
      skipped: false,
    }
  } catch {
    return { file, originalBytes, compressedBytes: originalBytes, skipped: true }
  }
}

const MAX_VIDEO_CLIENT = 20 * 1024 * 1024 // 20MB — 클라이언트 경고/거절

/**
 * 업로드 전 파일 준비. 이미지는 압축, 영상은 용량만 검사.
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

  // 이미지 (heic 등은 브라우저가 디코딩 못 하면 원본 시도)
  const result = await compressImage(file)
  const saved =
    result.skipped || result.compressedBytes >= result.originalBytes
      ? undefined
      : `${Math.round(result.originalBytes / 1024)}KB → ${Math.round(result.compressedBytes / 1024)}KB`
  return { ok: true, file: result.file, note: saved }
}
