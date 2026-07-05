import { getPostMetadata } from '@/lib/metadata'
import PostClient from './PostClient'

export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { postId: string } }) {
  return getPostMetadata(params.postId)
}

export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostClient />
}