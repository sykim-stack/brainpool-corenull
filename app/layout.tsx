import type { Metadata } from 'next'
import './globals.css'
import TabBar from '@/components/blocks/TabBar'
import FloatingActions from '@/components/blocks/FloatingActions'

export const metadata: Metadata = {
  title: 'CoreNull',
  description: '언어가 없는 생활 공간',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600&family=Noto+Sans+KR:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TabBar />
        <div className="app-shell">
          <main className="app-shell-content" style={{
            paddingTop: '56px',
            paddingBottom: '80px',
            minHeight: '100vh',
          }}>
            {children}
          </main>
        </div>
        <FloatingActions />
      </body>
    </html>
  )
}