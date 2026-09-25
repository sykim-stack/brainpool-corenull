-- Hero 이미지 원본은 그대로 두고, 화면별 표시 위치와 확대율만 저장한다.
-- x/y는 0~100 퍼센트, scale은 1~2.5 배 범위이며 API에서도 다시 제한한다.
ALTER TABLE corenull_houses
  ADD COLUMN IF NOT EXISTS yard_image_position jsonb NOT NULL DEFAULT '{"x":50,"y":50,"scale":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS living_image_position jsonb NOT NULL DEFAULT '{"x":50,"y":50,"scale":1}'::jsonb;

COMMENT ON COLUMN corenull_houses.yard_image_position IS 'Yard Hero image view settings: x/y percent and scale';
COMMENT ON COLUMN corenull_houses.living_image_position IS 'Living Hero image view settings: x/y percent and scale';
