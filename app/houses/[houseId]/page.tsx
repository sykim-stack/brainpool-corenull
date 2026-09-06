// app/houses/[houseId]/page.tsx
// 서버 컴포넌트 — generateMetadata + HouseClient 호출

import { redirect } from 'next/navigation'

export default function HousePage({ params }: { params: { houseId: string } }) {
  redirect(`/houses/${params.houseId}/yard`)
}