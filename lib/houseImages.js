// House image View helpers.
// Source of truth for URLs = corenull_houses columns.
// Missing URL → gradient/default (no AI-generated fake source).

export const HOUSE_IMAGE_SLOTS = ['avatar_url', 'yard_image_url', 'living_image_url']

export const DEFAULT_YARD_GRADIENT =
  'linear-gradient(135deg, #4A5240 0%, #7A8C6E 60%, #C8D5B9 100%)'

export const DEFAULT_LIVING_GRADIENT =
  'linear-gradient(135deg, #5C4A35 0%, #8A6F52 60%, #D8C4A8 100%)'

/**
 * @param {{ yard_image_url?: string|null, living_image_url?: string|null, avatar_url?: string|null }|null} house
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

export function houseAvatarUrl(house) {
  return house?.avatar_url || null
}
