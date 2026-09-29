'use client'

// 인앱 브라우저(카카오톡/Line/네이버/FB 등 WebView) 탐지.
// 인앱 WebView에서는 Google GIS/OAuth가 차단되므로 Google 버튼을 숨기고
// "외부 브라우저에서 열어 주세요" 안내만 보여준다. (자동 강제 브라우저 실행 X)

type BrowserInfo = { isInApp: boolean; name: string }

type InAppPattern = { name: string; re: RegExp }

const IN_APP_PATTERNS: InAppPattern[] = [
  { name: '카카오톡', re: /kakao/i },
  { name: 'LINE', re: /line\/[0-9]/i },
  { name: '네이버', re: /naver/i },
  { name: '페이스북', re: /fbap|fb_iab|facebook/i },
  { name: '인스타그램', re: /instagram/i },
  { name: '트위터', re: /twitter|tfi/i },
  // Samsung Browser / Chrome Mobile 은 'SamsungBrowser' / 'Chrome' 이므로 제외됨
  { name: '앱 내 웹뷰', re: /(; wv\)|android.*webview)/i },
]

export function detectInAppBrowser(ua: string = ''): BrowserInfo {
  for (const p of IN_APP_PATTERNS) {
    if (p.re.test(ua)) return { isInApp: true, name: p.name }
  }
  return { isInApp: false, name: '' }
}

export function useInAppBrowser(): BrowserInfo {
  if (typeof navigator === 'undefined') return { isInApp: false, name: '' }
  return detectInAppBrowser(navigator.userAgent)
}

export function copyUrlToClipboard(): void {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  if (!url) return
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      alert('URL이 복사되었어요. Chrome/Safari/Edge에 붙여넣어 주세요.')
    })
  } else {
    alert(url)
  }
}

export function InAppBrowserNotice({ name }: { name: string }) {
  return (
    <div style={styles.notice}>
      <span style={styles.noticeText}>
        💡 {name}에서는 Google 로그인이 지원되지 않아요.{' '}
        <button style={styles.copyBtn} onClick={copyUrlToClipboard}>URL 복사</button>
        <span style={styles.noticeHint}>(Chrome/Safari/Edge에서 열어 주세요)</span>
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  notice: {
    width: '100%',
    padding: '12px 14px',
    background: '#FFF7E6',
    border: '1px solid rgba(206,163,104,0.5)',
    borderRadius: 12,
    marginBottom: 10,
  },
  noticeText: { fontSize: 12, color: '#7a5920', display: 'block' },
  noticeHint: { color: '#9a7c3d', fontSize: 11 },
  copyBtn: {
    background: 'none',
    border: '1px solid #9a7c3d',
    color: '#7a5920',
    borderRadius: 8,
    padding: '2px 6px',
    fontSize: 11,
    cursor: 'pointer',
    verticalAlign: 'middle',
    marginLeft: 4,
  },
}
