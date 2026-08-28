'use client'

// ─────────────────────────────────────────────────────────────
// TopBar — 상단 고정 바. 5블록 구조의 최상단.
//
// 이 블록은 자기가 마당/거실/광장 중 어디에 있는지 모른다.
// "뒤로가기를 보여줄지", "우측에 어떤 아이콘을 둘지"는 전부
// 호출하는 페이지가 결정해서 props로 내려준다.
//
// Navigation Context 전환 규칙(§13: 다른 집 → 🏠 → 나의 마당,
// 나의 마당 → 🏛️ → 광장)은 이 컴포넌트가 아니라 페이지 쪽에서
// "지금 context가 뭔지"를 판단해 actions 배열을 구성할 때 반영한다.
// TopBar는 받은 걸 그릴 뿐이다.
// ─────────────────────────────────────────────────────────────

export interface TopBarAction {
  key: string
  emoji: string
  label?: string // 접근성용, 화면엔 아이콘만
  onClick: () => void
  disabled?: boolean
}

export interface TopBarProps {
  // 왼쪽 — 뒤로가기 또는 로고, 둘 중 하나만 (동시에 안 씀)
  onBack?: () => void
  logo?: React.ReactNode

  // 중앙/좌측 — 현재 화면 제목 (없으면 표시 안 함)
  title?: string

  // 우측 — 액션 아이콘 0~3개 (검색, 설정, 초대 등 페이지마다 다름)
  actions?: TopBarAction[]
}

export default function TopBar({ onBack, logo, title, actions = [] }: TopBarProps) {
  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        {onBack && (
          <button style={styles.backBtn} onClick={onBack} aria-label="뒤로가기">
            ←
          </button>
        )}
        {!onBack && logo}
        {title && <span style={styles.title}>{title}</span>}
      </div>

      {actions.length > 0 && (
        <div style={styles.right}>
          {actions.map((action) => (
            <button
              key={action.key}
              style={styles.actionBtn}
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.label}
            >
              {action.emoji}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '430px',
    height: '56px',
    background: 'rgba(254, 252, 248, 0.95)',
    borderBottom: '1px solid rgba(92, 61, 46, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    boxSizing: 'border-box',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  backBtn: {
    fontSize: '20px',
    color: '#2C1810',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Noto Serif KR', serif",
    fontSize: '16px',
    fontWeight: 600,
    color: '#2C1810',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  actionBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#F5F0E8',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    WebkitTapHighlightColor: 'transparent',
  },
}