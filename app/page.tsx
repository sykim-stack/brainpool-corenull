// 마당 진입점 단일화 — / 는 /yard 로 보낸다.
// 이웃·발견·신청은 app/yard/page.tsx 한곳만 유지한다.
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/yard')
}
