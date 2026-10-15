// lib/uploadClient.ts
// 업로드 경로 분기:
// - 이미지(작음): 기존 /api/corenull/upload 프록시 (압축 후 3.5MB 이하)
// - 영상: Signed URL → Supabase Storage 직접 PUT (Vercel 4.5MB body 한도 우회)

const PROXY_SAFE_BYTES = 3.5 * 1024 * 1024

function isVideoFile(file: File): boolean {
  const t = (file.type || '').toLowerCase()
  if (t.startsWith('video/')) return true
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || '')
}

export type UploadedMedia = {
  type: 'image' | 'video'
  url: string
  file?: string
}

export type UploadOneResult =
  | { ok: true; item: UploadedMedia }
  | { ok: false; error: string }

async function uploadViaProxy(file: File, postId?: string): Promise<UploadOneResult> {
  const form = new FormData()
  form.append('files', file)
  if (postId) form.append('post_id', postId)
  const res = await fetch('/api/corenull/upload', { method: 'POST', body: form })
  const data = await res.json().catch(() => null)
  const item = data?.data?.[0]
  if (!res.ok || data?._error || !item?.url || item._error) {
    return {
      ok: false,
      error: item?._error || data?._error || `업로드 실패 (HTTP ${res.status})`,
    }
  }
  return {
    ok: true,
    item: {
      type: item.type === 'video' ? 'video' : 'image',
      url: item.url,
      file: item.file || file.name,
    },
  }
}

async function uploadViaSignedUrl(file: File, postId?: string): Promise<UploadOneResult> {
  const contentType =
    file.type ||
    (/\.webm$/i.test(file.name)
      ? 'video/webm'
      : /\.mov$/i.test(file.name)
        ? 'video/quicktime'
        : 'video/mp4')

  const signRes = await fetch('/api/corenull/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contentType,
      fileName: file.name,
      size: file.size,
      post_id: postId || null,
    }),
  })
  const signData = await signRes.json().catch(() => null)
  const signed = signData?.data
  if (!signRes.ok || signData?._error || !signed?.signedUrl || !signed?.publicUrl) {
    return {
      ok: false,
      error: signData?._error || `서명 URL 발급 실패 (HTTP ${signRes.status})`,
    }
  }

  const put = await fetch(signed.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  })

  if (!put.ok) {
    const detail = await put.text().catch(() => '')
    return {
      ok: false,
      error: `영상 직접 업로드 실패 (HTTP ${put.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`,
    }
  }

  return {
    ok: true,
    item: {
      type: signed.type === 'image' ? 'image' : 'video',
      url: signed.publicUrl,
      file: file.name,
    },
  }
}

/**
 * 파일 1개를 업로드한다.
 * 영상 또는 프록시 안전 용량을 넘는 파일은 Signed URL 경로를 쓴다.
 */
export async function uploadOneFile(
  file: File,
  opts?: { postId?: string }
): Promise<UploadOneResult> {
  if (isVideoFile(file) || file.size > PROXY_SAFE_BYTES) {
    return uploadViaSignedUrl(file, opts?.postId)
  }
  return uploadViaProxy(file, opts?.postId)
}
