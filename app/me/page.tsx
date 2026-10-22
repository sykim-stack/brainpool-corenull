'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey, setOwnerKey as persistOwnerKey } from '@/lib/ownerKey'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import OwnerGate from '@/components/corenull/OwnerGate'
import { useGoogleLogin } from '@/hooks/useGoogleLogin'
import { useInAppBrowser, InAppBrowserNotice } from '@/components/corenull/InAppBrowserGate'

export default function MePage() {
  const [library, setLibrary] = useState<any>(null)
  const [ownerKey, setOwnerKeyState] = useState('')
  const [ownerReady, setOwnerReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myHouses, setMyHouses] = useState<any[]>([])
  const [pendingReceived, setPendingReceived] = useState(0)
  const [syncCode, setSyncCode] = useState('')
  const [syncExpiry, setSyncExpiry] = useState<Date | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [syncMode, setSyncMode] = useState<'none' | 'show' | 'input'>('none')
  const [syncMsg, setSyncMsg] = useState('')
  const router = useRouter()

  const { googleRef, available: googleAvailable, error: googleError } = useGoogleLogin(handleGoogleConnect)
  const { isInApp, name: inAppName } = useInAppBrowser()

  useEffect(() => {
    const key = getOwnerKey()
    setOwnerKeyState(key)
    setOwnerReady(true)
    if (!key) {
      setLoading(false)
      return
    }
    Promise.all([
      fetch(`/api/corenull/library?owner_key=${key}`).then(r => r.json()),
      fetch(`/api/corenull/houses?owner_key=${key}`).then(r => r.json()),
    ]).then(([lib, h]) => {
      setLibrary(lib.data)
      setMyHouses(h.data || [])
      setLoading(false)

      const myHouse = h.data?.[0]
      if (myHouse) {
        fetch(`/api/corenull/houses?action=neighbors&house_id=${myHouse.id}`)
          .then(r => r.json())
          .then((nb) => {
            const count = (nb.data || []).filter((n: any) => n.status === 'pending' && n.direction === 'incoming').length
            setPendingReceived(count)
          })
      }
    })
  }, [])

  function handleGoogleConnect(ownerKey: string) {
    persistOwnerKey(ownerKey)
    setSyncMsg('✅ Google 계정이 연결되었습니다.')
  }

  const handleGenerateCode = async () => {
    if (!ownerKey) return
    const res = await fetch('/api/identity?action=link-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.code) {
      setSyncCode(data.data.code)
      setSyncExpiry(new Date(Date.now() + 10 * 60 * 1000))
      setSyncMode('show')
      setSyncMsg('')
    } else {
      setSyncMsg(data._error || '코드 생성 실패')
    }
  }

  const handleRedeemCode = async () => {
    if (!inputCode.trim()) return
    const res = await fetch('/api/identity?action=redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode.trim(), owner_key: ownerKey }),
    })
    const data = await res.json()
    if (data.data?.owner_key) {
      persistOwnerKey(data.data.owner_key)
      setOwnerKeyState(data.data.owner_key)
      setSyncMsg('✅ 기기 연결 완료')
      setSyncMode('none')
      setInputCode('')
    } else {
      setSyncMsg(data._error || '코드가 유효하지 않아요')
    }
  }

  const handleHouseManage = () => {
    if (myHouses.length === 1) router.push(`/houses/${myHouses[0].id}/yard`)
    else if (myHouses.length > 1) router.push('/yard')
    else router.push('/living')
  }

  if (!ownerReady) return null
  if (!ownerKey) return <OwnerGate />

  return (
    <div>
      <TopBar logo={<CoreNullLogo size="sm" />} title="나" />
      {isInApp && <InAppBrowserNotice name={inAppName} />}

      <div style={{ padding: '16px 16px 40px' }}>
        <div style={styles.menuSection}>
          <div style={styles.menuItem} onClick={() => router.push('/me/library')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(74,124,63,0.12)' }}>📚</div>
            <span style={styles.menuLabel}>서재</span>
            <span style={styles.menuBadge}>{library?.bookmarks?.length || 0}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/posts')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(58,82,120,0.12)' }}>📝</div>
            <span style={styles.menuLabel}>내 글</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/neighbors')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🤝</div>
            <span style={styles.menuLabel}>이웃</span>
            {pendingReceived > 0 && <span style={styles.menuBadge}>{pendingReceived}</span>}
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuItem} onClick={handleHouseManage}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🏡</div>
            <span style={styles.menuLabel}>내 집 관리</span>
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.syncHeader}>
            <span style={styles.syncTitle}>🔗 기기 연결</span>
            <span style={styles.syncDesc}>다른 기기에서 같은 Owner로 들어가려면</span>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
            <button
              style={{ ...styles.syncBtn, ...(syncMode === 'show' ? styles.syncBtnActive : {}) }}
              onClick={handleGenerateCode}
            >
              코드 만들기
            </button>
            <button
              style={{ ...styles.syncBtn, ...(syncMode === 'input' ? styles.syncBtnActive : {}) }}
              onClick={() => { setSyncMode('input'); setSyncMsg('') }}
            >
              코드 입력
            </button>
          </div>
          {syncMode === 'show' && syncCode && (
            <div style={styles.syncBox}>
              <div style={styles.syncCode}>{syncCode}</div>
              <div style={styles.syncExpiry}>10분 안에 입력하세요</div>
            </div>
          )}
          {syncMode === 'input' && (
            <div style={styles.syncBox}>
              <input
                style={styles.syncInput}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="코드"
              />
              <button style={styles.syncConfirmBtn} onClick={handleRedeemCode}>연결</button>
            </div>
          )}
          {syncMsg && <div style={styles.syncMsg}>{syncMsg}</div>}
        </div>

        <div style={styles.menuSection}>
          <div style={styles.syncHeader}>
            <span style={styles.syncTitle}>🔗 Google 계정 연결</span>
            <span style={styles.syncDesc}>Chrome/Edge/Safari에서 Google 로그인 후 계정 연결</span>
          </div>
          <div style={styles.googleConnectBox}>
            {googleAvailable ? (
              <div ref={googleRef} style={styles.googleBtnWrap} />
            ) : googleError ? (
              <div style={styles.syncHint}>Google 버튼을 불러오지 못했어요.</div>
            ) : (
              <div style={styles.syncHint}>Google 연결은 관리자 설정 중입니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  menuSection: {
    background: '#FEFCF8', borderRadius: 16, border: '1px solid rgba(92,61,46,0.12)',
    overflow: 'hidden', marginBottom: 12,
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', borderBottom: '1px solid rgba(92,61,46,0.08)', cursor: 'pointer',
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 14, color: '#1C1208' },
  menuBadge: { fontSize: 12, color: '#9A8470', fontWeight: 500 },
  menuArrow: { fontSize: 16, color: '#9A8470' },
  syncHeader: { padding: '16px 16px 8px', borderBottom: '1px solid rgba(92,61,46,0.08)' },
  syncTitle: { display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1208', marginBottom: 2 },
  syncDesc: { display: 'block', fontSize: 11, color: '#9A8470' },
  syncBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)',
    fontSize: 13, color: '#5C4A35', cursor: 'pointer',
  },
  syncBtnActive: { background: '#2C1810', color: 'white', border: '1px solid #2C1810' },
  syncBox: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  syncCode: {
    fontSize: 36, fontWeight: 700, color: '#2C1810',
    letterSpacing: 8, textAlign: 'center', padding: '16px', background: '#F5F0E8', borderRadius: 12,
  },
  syncExpiry: { fontSize: 11, color: '#9A8470', textAlign: 'center' },
  syncHint: { fontSize: 12, color: '#5C4A35', textAlign: 'center' },
  syncInput: {
    width: '100%', height: 48, textAlign: 'center',
    background: '#F5F0E8', border: '1px solid rgba(92,61,46,0.12)',
    borderRadius: 12, fontSize: 24, fontWeight: 700,
    letterSpacing: 8, color: '#2C1810', outline: 'none', boxSizing: 'border-box',
  },
  syncConfirmBtn: {
    width: '100%', padding: '12px', background: '#2C1810', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  syncMsg: { fontSize: 13, color: '#5C4A35', textAlign: 'center', padding: '0 16px 12px' },
  googleConnectBox: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  googleBtnWrap: { width: '100%', display: 'flex', justifyContent: 'center' },
}
