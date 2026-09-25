-- CoreNull House image slots (View surface for Yard / Living / Profile)
-- Run on Supabase before deploying dependent UI.
-- Design: House owns image URLs. No Message duplication.

ALTER TABLE corenull_houses
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS yard_image_url text,
  ADD COLUMN IF NOT EXISTS living_image_url text;

COMMENT ON COLUMN corenull_houses.avatar_url IS 'Profile / Ring center image URL';
COMMENT ON COLUMN corenull_houses.yard_image_url IS 'Yard / alley Hero background URL';
COMMENT ON COLUMN corenull_houses.living_image_url IS 'Living / corridor Hero background URL';
