// app/houses/[houseId]/page.tsx
// 서버 컴포넌트 — generateMetadata + HouseClient 호출

import { redirect } from 'next/navigation'

export default async function HousePage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  redirect(`/houses/${houseId}/yard`)
}