// ─────────────────────────────────────────────────────────────
// House image View helpers (feat/house-images)
//
// 목적: Poster보다 먼저 House가 이미지를 소유하게 한다.
//   House.avatar_url / yard_image_url / living_image_url
//   → Yard / Living HeroBlock.imageUrl
//
// 원칙:
// - URL의 Source of Truth = corenull_houses 컬럼 (Message 복제 없음)
// - 이미지 없으면 gradient fallback (AI가 원본처럼 가짜 이미지 생성 금지)
// - 업로드는 /api/corenull/upload 재사용 (새 파이프라인 없음)
//
// 눈으로 확인할 곳:
// - /me/house 에서 등록 → /yard, /living Hero 배경·Ring 아바타
// ─────────────────────────────────────────────────────────────

export const HOUSE_IMAGE_SLOTS = ['avatar_url', 'yard_image_url', 'living_image_url']

/** 마당·골목 Hero — 이미지 없을 때 */
export const DEFAULT_YARD_GRADIENT =
  'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)'

/** 거실·복도 Hero — 이미지 없을 때 */
export const DEFAULT_LIVING_GRADIENT =
  'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)'

/**
 * HeroBlock background prop 생성.
 * @param {{ yard_image_url?: string|null, living_image_url?: string|null }|null} house
 * @param {'yard'|'living'} view
 */
export function houseHeroBackground(house, view) {
  if (view === 'living') {
    return {
      imageUrl: house?.living_image_url || null,
      gradient: DEFAULT_LIVING_GRADIENT,
    }
  }
  return {
    imageUrl: house?.yard_image_url || null,
    gradient: DEFAULT_YARD_GRADIENT,
  }
}

/** Ring 중앙 / 이웃 프로필용. 없으면 UI에서 🏡 등 fallback */
export function houseAvatarUrl(house) {
  return house?.avatar_url || null
}
