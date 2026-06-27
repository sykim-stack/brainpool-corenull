// app/houses/[houseId]/page.tsx
// 서버 컴포넌트 — generateMetadata + HouseClient 호출

import { getHouseMetadata } from '@/lib/metadata'
import HouseClient from './HouseClient'

export async function generateMetadata({ params }: { params: { houseId: string } }) {
  return getHouseMetadata(params.houseId)
}

export default function HousePage({ params }: { params: { houseId: string } }) {
  return <HouseClient />
}