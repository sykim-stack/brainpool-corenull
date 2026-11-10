-- 방 히어로/커버 이미지 (방 화면 · 초대장 상단 공용)
ALTER TABLE public.corenull_rooms
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_position jsonb NOT NULL DEFAULT '{"x":50,"y":50,"scale":1}'::jsonb;

COMMENT ON COLUMN public.corenull_rooms.cover_image_url IS 'Room Hero / invitation header image URL';
COMMENT ON COLUMN public.corenull_rooms.cover_image_position IS 'Room cover view: x/y percent and scale';
