'use client'

import { useRouter } from 'next/navigation'

// §7 레이어 분리: 글쓰기·내정보는 기본 탭바(TabBar)와 완전히 다른 z-layer.
// 화면별 하단 고정 UI(예: PostClient 댓글창, bottom:64~124 영역)가 추가돼도
// 이 레이어는 그 위 고정 좌표(bottom:132 이상)에 있어 구조적으로 겹치지 않는다.
// 좌표를 화면마다 동적으로 계산하지 않는 것이 이 분리의 핵심 — 항상 같은 자리.
export default function FloatingActions() {
  const router = useRouter()

  return (
    <div style={{
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '430px',
      bottom: 0,
      zIndex: 150,
      pointerEvents: 'none', // 컨테이너 자체는 클릭 통과, 버튼만 pointerEvents 복구
    }}>
      {/* 글쓰기 — 주 행동, 위쪽 */}
      <button
        onClick={() => router.push('/write')}
        aria-label="글쓰기"
        style={{
          position: 'absolute',
          right: '16px',
          bottom: '200px',
          width: '56px',
          height: '56px',
          borderRadius: '18px',
          background: '#2C1810',
          border: 'none',
          fontSize: '24px',
          color: '#FBF8F2',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(44, 24, 16, 0.35)',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ✏️
      </button>

      {/* 내정보 — 보조 행동, 아래쪽 (기본 탭바 바로 위) */}
      <button
        onClick={() => router.push('/me')}
        aria-label="내정보"
        style={{
          position: 'absolute',
          right: '16px',
          bottom: '132px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#FEFCF8',
          border: '1px solid rgba(92, 61, 46, 0.12)',
          fontSize: '18px',
          color: '#2C1810',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(44, 24, 16, 0.18)',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        👤
      </button>
    </div>
  )
}