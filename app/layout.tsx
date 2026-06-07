import type { Metadata } from 'next'
import TabBar from '@/components/corenull/TabBar'

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
      <body style={{
        margin: 0,
        padding: 0,
        background: '#FBF8F2',
        fontFamily: "'Noto Sans KR', sans-serif",
        color: '#1C1208',
        maxWidth: '430px',
        marginLeft: 'auto',
        marginRight: 'auto',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}>
        <main style={{
          paddingTop: '56px',
          paddingBottom: '80px',
          minHeight: '100vh',
        }}>
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  )
}