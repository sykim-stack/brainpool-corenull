// CoreNull - Upload API
// 이미지: multipart → Vercel (압축 후 보통 3.5MB 이하)
// 영상: signed URL → 클라이언트가 Supabase Storage에 직접 업로드
//        (Vercel body 4.5MB 한도 회피 — HTTP 413 방지)

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_VIDEO_SIZE = 80 * 1024 * 1024 // 80MB
const MAX_IMAGE_SIZE = 4 * 1024 * 1024 // 4MB — Vercel 경유

const IMAGE_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const handler = async (req) => {
  const traceId = crypto.randomUUID()
  if (req.method !== 'POST') {
    return Response.json({ _error: 'method_not_allowed', traceId }, { status: 405 })
  }

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return handleSign(req, traceId)
  }
  return handleMultipart(req, traceId)
}

const handleSign = async (req, traceId) => {
  const { requireActor } = await import('@/lib/actor')
  const gate = requireActor(req, traceId)
  if (gate.error) return gate.error

  const body = await req.json().catch(() => ({}))
  const { filename, contentType, size, post_id } = body

  const mime = contentType || 'video/mp4'
  const isVideo =
    ALLOWED_VIDEO.includes(mime) ||
    /\.(mp4|webm|mov)$/i.test(filename || '')
  if (!isVideo) {
    return Response.json(
      { _error: 'sign_only_for_video', detail: '이미지는 일반 업로드를 사용해 주세요.', traceId },
      { status: 400 },
    )
  }
  if (size && Number(size) > MAX_VIDEO_SIZE) {
    return Response.json(
      {
        _error: 'video_too_large',
        detail: `영상은 ${MAX_VIDEO_SIZE / 1024 / 1024}MB 이하만 올릴 수 있어요.`,
        traceId,
      },
      { status: 400 },
    )
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const ext = (filename && filename.split('.').pop()) || 'mp4'
  const path = post_id
    ? `${post_id}/${crypto.randomUUID()}.${ext}`
    : `orphan/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from('corenull-videos')
    .createSignedUploadUrl(path)

  if (error) {
    return Response.json({ _error: error.message, traceId }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('corenull-videos').getPublicUrl(path)

  return Response.json({
    data: {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
    },
    traceId,
  })
}

const handleMultipart = async (req, traceId) => {
  const { requireActor } = await import('@/lib/actor')
  const gate = requireActor(req, traceId)
  if (gate.error) return gate.error

  let formData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ _error: 'invalid_multipart', traceId }, { status: 400 })
  }

  const files = formData.getAll('files')
  const post_id = formData.get('post_id')

  if (!files || files.length === 0) {
    return Response.json({ _error: 'files_required', traceId }, { status: 400 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const results = []

  for (const file of files) {
    const mime = file.type
    const isImage = ALLOWED_IMAGE.includes(mime)
    const isVideo = ALLOWED_VIDEO.includes(mime)

    if (!isImage && !isVideo) {
      results.push({ _error: `unsupported_type: ${mime || 'unknown'}`, file: file.name })
      continue
    }

    if (isVideo) {
      results.push({
        _error: 'use_direct_upload',
        detail: '영상은 직접 업로드 경로를 사용해야 해요. 페이지를 새로고침 후 다시 시도해 주세요.',
        file: file.name,
      })
      continue
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      results.push({ _error: 'image_too_large', file: file.name })
      continue
    }

    const bucket = 'corenull-images'
    const ext = IMAGE_EXT[mime] || 'jpg'
    const path = post_id
      ? `${post_id}/${crypto.randomUUID()}.${ext}`
      : `orphan/${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mime,
      upsert: false,
    })

    if (error) {
      results.push({ _error: error.message, file: file.name })
      continue
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
    results.push({
      type: 'image',
      url: urlData.publicUrl,
      file: file.name,
    })
  }

  return Response.json({ data: results, traceId })
}

export { handler as POST }
