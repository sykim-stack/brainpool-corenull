import { getRoomMetadata } from '@/lib/metadata'
import RoomClient from './RoomClient'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return getRoomMetadata(id)
}

export default function RoomPage() {
  return <RoomClient />
}