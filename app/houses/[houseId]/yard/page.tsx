import { getHouseMetadata } from '@/lib/metadata'
import YardClient from './YardClient'

export async function generateMetadata({ params }: { params: { houseId: string } }) {
  return getHouseMetadata(params.houseId)
}

export default function HouseYardPage() {
  return <YardClient />
}