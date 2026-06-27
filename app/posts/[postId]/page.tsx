import { getPostMetadata } from '@/lib/metadata'
import PostClient from './PostClient'

export async function generateMetadata({ params }: { params: { postId: string } }) {
  return getPostMetadata(params.postId)
}

export default function PostPage({ params }: { params: { postId: string } }) {
  return <PostClient />
}