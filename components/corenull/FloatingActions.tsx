'use client'

import { useRouter } from 'next/navigation'

export default function FloatingActions() {
  const router = useRouter()

  return (
    <div style={styles.container}>
      <button
        style={{ ...styles.button, ...styles.profile }}
        onClick={() => router.push('/me')}
        aria-label="프로필"
      >
        👤
      </button>
      <button
        style={{ ...styles.button, ...styles.write }}
        onClick={() => router.push('/write')}
        aria-label="글쓰기"
      >
        ✏️
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '430px',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: 150,
  },
  button: {
    position: 'absolute',
    right: 16,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(44,24,16,0.25)',
    pointerEvents: 'auto',
  },
  profile: {
    bottom: 132,
    width: 40,
    height: 40,
    fontSize: 16,
    background: '#F5F0E8',
    color: '#2C1810',
  },
  write: {
    bottom: 200,
    width: 48,
    height: 48,
    fontSize: 20,
    background: '#2C1810',
    color: '#FBF8F2',
  },
}
