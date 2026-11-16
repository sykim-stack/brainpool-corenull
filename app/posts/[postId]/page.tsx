import { getPostMetadata } from '@/lib/metadata'
import PostClient from './PostClient'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  return getPostMetadata(postId)
}

export default function PostPage() {
  return <PostClient />
}