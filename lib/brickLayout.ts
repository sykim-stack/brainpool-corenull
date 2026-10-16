const desktopPattern = [3, 2, 3, 2, 3]
const mobilePattern = [2, 1, 2, 1, 2]

/** 공용 게시물·공개방 brick 패턴: 13개/8개가 한 슬라이드 */
export const BRICK_LAYOUT = {
  desktop: {
    pattern: desktopPattern,
    pageSize: desktopPattern.reduce((total, rowSize) => total + rowSize, 0),
  },
  mobile: {
    pattern: mobilePattern,
    pageSize: mobilePattern.reduce((total, rowSize) => total + rowSize, 0),
  },
}

export type BrickViewMode = 'desktop' | 'mobile'
export type BrickRow<T> = { cards: T[]; cols: 'large' | '3' | '2'; offset: boolean }

/** 거실·마당·광장에 공통으로 쓰는 brick 행 생성 규칙. */
export function partitionBrick<T>(items: T[], viewMode: BrickViewMode = 'desktop'): BrickRow<T>[] {
  const pattern = BRICK_LAYOUT[viewMode].pattern
  const rows: BrickRow<T>[] = []
  let i = 0
  let patternIndex = 0
  let previousColumns = ''

  while (i < items.length) {
    const cards = items.slice(i, i + pattern[patternIndex % pattern.length])
    const columns = cards.length === 1 ? 'large' : cards.length === 3 ? '3' : '2'
    rows.push({
      cards,
      cols: columns,
      // PC 2칸 행은 항상 3칸 카드 너비로 (CSS data-offset / data-cols=2)
      offset: viewMode === 'desktop' && columns === '2',
    })
    previousColumns = columns
    i += cards.length
    patternIndex++
  }

  return rows
}
