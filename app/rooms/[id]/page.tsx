import { getRoomMetadata } from '@/lib/metadata'
import RoomClient from './RoomClient'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return getRoomMetadata(params.id)
}

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomClient />
}