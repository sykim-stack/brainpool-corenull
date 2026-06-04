// CoreNull - Upload API
// 이미지 / 영상 통합 업로드
// Supabase Storage → URL 반환 → messages.meta.media 에 저장

const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_VIDEO = ['video/mp4', 'video/webm']
const MAX_VIDEO_SIZE = 50 * 1024 * 1024  // 50MB (Supabase 한도)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024  // 10MB

const handler = async (req) => {
  const traceId = crypto.randomUUID()

  if (req.method === 'POST') return handlePost(req, traceId)

  return Response.json({ _error: 'method_not_allowed', traceId }, { status: 500 })
}

const handlePost = async (req, traceId) => {
  const formData = await req.formData()
  const files = formData.getAll('files')       // 여러 파일 동시 업로드
  const post_id = formData.get('post_id')      // 어느 포스트에 붙일지

  if (!files || files.length === 0) {
    return Response.json({ _error: 'files_required', traceId }, { status: 500 })
  }

  const { getSupabase } = await import('@/lib/supabase')
  const supabase = getSupabase()
  if (!supabase) return Response.json({ _error: 'supabase_init_failed', traceId }, { status: 500 })

  const results = []

  for (const file of files) {
    const mime = file.type
    const isImage = ALLOWED_IMAGE.includes(mime)
    const isVideo = ALLOWED_VIDEO.includes(mime)

    // 지원하지 않는 형식
    if (!isImage && !isVideo) {
      results.push({ _error: `unsupported_type: ${mime}`, file: file.name })
      continue
    }

    // 용량 체크
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      results.push({ _error: 'image_too_large', file: file.name })
      continue
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      results.push({ _error: 'video_too_large', file: file.name })
      continue
    }

    // 버킷 / 경로 결정
    const bucket = isImage ? 'corenull-images' : 'corenull-videos'
    const ext = file.name.split('.').pop()
    const path = post_id
      ? `${post_id}/${crypto.randomUUID()}.${ext}`
      : `orphan/${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: mime, upsert: false })

    if (error) {
      results.push({ _error: error.message, file: file.name })
      continue
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    results.push({
      type: isImage ? 'image' : 'video',
      url: urlData.publicUrl,
      file: file.name,
    })
  }

  return Response.json({ data: results, traceId })
}

export { handler as POST }