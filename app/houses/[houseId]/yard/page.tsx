import { getHouseMetadata } from '@/lib/metadata'
import YardClient from './YardClient'

export async function generateMetadata({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  return getHouseMetadata(houseId)
}

export default function HouseYardPage() {
  return <YardClient />
}