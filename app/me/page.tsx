'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey, setOwnerKey as persistOwnerKey } from '@/lib/ownerKey'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import OwnerGate from '@/components/corenull/OwnerGate'

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
      setSyncExpiry(new Date(data.data.expires_at))
      setSyncMode('show')
    }
  }

  const handleConfirmCode = async () => {
    if (!inputCode.trim()) return
    const res = await fetch('/api/identity?action=link-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode.trim() }),
    })
    const data = await res.json()
    if (data.data?.owner_key) {
      // Owner 복구: device_id가 아니라 owner_key 저장
      persistOwnerKey(data.data.owner_key)
      setSyncMsg('✅ 동기화 완료! 페이지를 새로고침 해주세요.')
    } else {
      setSyncMsg('❌ ' + (data._error || '코드가 올바르지 않아요'))
    }
  }

  const handleHouseManage = () => {
    if (myHouses.length === 1) router.push(`/houses/${myHouses[0].id}/yard`)
    else if (myHouses.length > 1) router.push('/')
    else router.push('/houses/create')
  }

  if (ownerReady && !ownerKey) {
    return <OwnerGate />
  }

  if (loading) return <div style={styles.loading}>👤</div>

  return (
    <div>
      <TopBar
        logo={<CoreNullLogo size="sm" />}
        title="나"
      />

      <div style={styles.body}>
        <div style={styles.profileCard}>
          <div style={styles.profileAvatar}>🌱</div>
          <div>
            <div style={styles.profileName}>나의 공간</div>
            <div style={styles.profileDevice}>{ownerKey}</div>
          </div>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{library?.my_posts?.length || 0}</span>
            <span style={styles.statLabel}>이야기</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{library?.footprints?.length || 0}</span>
            <span style={styles.statLabel}>발자취</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{(library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0)}</span>
            <span style={styles.statLabel}>관심</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuItem} onClick={() => router.push('/me/library')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(74,82,64,0.12)' }}>📚</div>
            <span style={styles.menuLabel}>서재</span>
            <span style={styles.menuBadge}>{
              (library?.footprints?.length || 0) +
              (library?.saved_rooms?.length || 0) +
              (library?.saved_posts?.length || 0)
            }</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/posts')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>📝</div>
            <span style={styles.menuLabel}>내가 쓴 이야기</span>
            <span style={styles.menuBadge}>{library?.my_posts?.length || 0}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/footprints')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>👣</div>
            <span style={styles.menuLabel}>발자취</span>
            <span style={styles.menuBadge}>{library?.footprints?.length || 0}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/saved')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>🔖</div>
            <span style={styles.menuLabel}>관심</span>
            <span style={styles.menuBadge}>{(library?.saved_rooms?.length || 0) + (library?.saved_posts?.length || 0)}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.menuItem} onClick={() => router.push('/me/house')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🖼️</div>
            <span style={styles.menuLabel}>집 이미지</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={handleHouseManage}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🏡</div>
            <span style={styles.menuLabel}>내 집 관리</span>
            <span style={styles.menuBadge}>{myHouses.length > 0 ? myHouses.length : ''}</span>
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem} onClick={() => router.push('/me/neighbors')}>
            <div style={{ ...styles.menuIcon, background: 'rgba(193,127,60,0.12)' }}>🏘️</div>
            <span style={styles.menuLabel}>이웃</span>
            {pendingReceived > 0 && (
              <span style={{ ...styles.menuBadge, color: '#C17F3C', fontWeight: 600 }}>{pendingReceived}</span>
            )}
            <span style={styles.menuArrow}>›</span>
          </div>
          <div style={styles.menuItem}>
            <div style={{ ...styles.menuIcon, background: 'rgba(200,213,185,0.4)' }}>⚙️</div>
            <span style={styles.menuLabel}>설정</span>
            <span style={styles.menuArrow}>›</span>
          </div>
        </div>

        <div style={styles.menuSection}>
          <div style={styles.syncHeader}>
            <span style={styles.syncTitle}>📱 기기 동기화</span>
            <span style={styles.syncDesc}>다른 기기에서 같은 계정으로 이어가기</span>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
            <button
              style={{ ...styles.syncBtn, ...(syncMode === 'show' ? styles.syncBtnActive : {}) }}
              onClick={() => { setSyncMode('show'); handleGenerateCode() }}
            >코드 발급</button>
            <button
              style={{ ...styles.syncBtn, ...(syncMode === 'input' ? styles.syncBtnActive : {}) }}
              onClick={() => { setSyncMode('input'); setSyncCode(''); setSyncMsg('') }}
            >코드 입력</button>
          </div>
          {syncMode === 'show' && syncCode && (
            <div style={styles.syncBox}>
              <div style={styles.syncCode}>{syncCode}</div>
              <div style={styles.syncExpiry}>{syncExpiry ? `${syncExpiry.toLocaleTimeString('ko-KR')} 까지` : ''}</div>
              <div style={styles.syncHint}>새 기기에서 이 코드를 입력하세요 (5분 유효)</div>
            </div>
          )}
          {syncMode === 'input' && (
            <div style={styles.syncBox}>
              <input
                style={styles.syncInput}
                placeholder="6자리 코드 입력"
                value={inputCode}
                onChange={e => setInputCode(e.target.value)}
                maxLength={6}
                inputMode="numeric"
              />
              <button style={styles.syncConfirmBtn} onClick={handleConfirmCode}>확인</button>
              {syncMsg && <div style={styles.syncMsg}>{syncMsg}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontSize: 40 },
  body: { padding: '16px' },
  profileCard: {
    background: '#FEFCF8', borderRadius: 20, border: '1px solid rgba(92,61,46,0.12)',
    padding: '20px', display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 12, boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'linear-gradient(135deg, #4A5240, #C17F3C)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
  },
  profileName: { fontFamily: "'Noto Serif KR', serif", fontSize: 18, fontWeight: 600, color: '#2C1810' },
  profileDevice: { fontSize: 11, color: '#9A8470', marginTop: 4 },
  statsRow: {
    background: '#FEFCF8', borderRadius: 16, border: '1px solid rgba(92,61,46,0.12)',
    padding: '16px', display: 'flex', alignItems: 'center',
    marginBottom: 12, boxShadow: '0 2px 20px rgba(44,24,16,0.08)',
  },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 22, fontWeight: 600, color: '#2C1810' },
  statLabel: { fontSize: 11, color: '#9A8470' },
  statDivider: { width: 1, height: 32, background: 'rgba(92,61,46,0.12)' },
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
  syncMsg: { fontSize: 13, color: '#5C4A35', textAlign: 'center' },
}
