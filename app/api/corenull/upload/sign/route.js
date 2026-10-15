// CoreNull - Signed upload URL
// 영상 등은 Vercel 4.5MB body 한도를 넘기 때문에 클라이언트가 Supabase Storage에 직접 PUT한다.
// 이 엔드포인트는 path + signedUrl + publicUrl만 발급한다.

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']
const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25MB — Storage 직접 업로드 한도(앱 정책)
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

const EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method !== 'POST') {
    return Response.json({ _error: 'method_not_allowed', traceId }, { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return Response.json({ _error: 'invalid_json', traceId }, { status: 400 })
  }

  const contentType = String(body?.contentType || '').toLowerCase().split(';')[0].trim()
  const fileName = String(body?.fileName || '')
  const post_id = body?.post_id ? String(body.post_id) : null
  const size = typeof body?.size === 'number' ? body.size : null

  const isImage = ALLOWED_IMAGE.includes(contentType)
  const isVideo = ALLOWED_VIDEO.includes(contentType)

  if (!isImage && !isVideo) {
    return Response.json(
      { _error: `unsupported_type: ${contentType || 'unknown'}`, traceId },
      { status: 400 }
    )
  }

  if (isVideo && size != null && size > MAX_VIDEO_SIZE) {
    return Response.json({ _error: 'video_too_large', traceId }, { status: 400 })
  }
  if (isImage && size != null && size > MAX_IMAGE_SIZE) {
    return Response.json({ _error: 'image_too_large', traceId }, { status: 400 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })
  }

  const bucket = isImage ? 'corenull-images' : 'corenull-videos'
  const nameExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null
  const ext = EXT[contentType] || nameExt || (isVideo ? 'mp4' : 'jpg')
  const path = post_id
    ? `${post_id}/${crypto.randomUUID()}.${ext}`
    : `orphan/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data?.signedUrl) {
    return Response.json(
      { _error: error?.message || 'signed_url_failed', traceId },
      { status: 500 }
    )
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return Response.json({
    data: {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path || path,
      publicUrl: urlData.publicUrl,
      bucket,
      type: isImage ? 'image' : 'video',
      contentType,
    },
    traceId,
  })
}

export { handler as POST }
