# House Images

**상태**: feat/house-images 구현 중  
**원칙**: 원본을 늘리지 않고 View를 풍부하게 한다. Poster보다 House 이미지를 먼저.

## 슬롯 (House Owner)

| 컬럼 | 용도 |
|------|------|
| `avatar_url` | 프로필 / Ring 중앙 |
| `yard_image_url` | 마당 · 골목 Hero |
| `living_image_url` | 거실 · 복도 Hero |

Hero 배경은 `/me/house`의 **위치 조절**에서 이미지를 드래그하고 확대할 수 있다. 원본 URL은 그대로 유지하고, 다음 JSON 설정만 House에 저장한다.

| 컬럼 | 형식 | 의미 |
|------|------|------|
| `yard_image_position` | `{x, y, scale}` | 마당 Hero의 중심 위치와 확대율 |
| `living_image_position` | `{x, y, scale}` | 거실 Hero의 중심 위치와 확대율 |

`x`와 `y`는 0~100 퍼센트, `scale`은 1~2.5배 범위다.

## 파이프라인

```
/me/house UI
  → /api/corenull/upload  (기존 write 업로드)
  → URL
  → PATCH /api/corenull/houses  (owner_key 검증)
  → corenull_houses
  → HeroBlock.imageUrl
```

새 업로드 API 없음. 위치 편집도 기존 House PATCH API를 재사용한다.

## DB

`supabase/migrations/20260912_house_images.sql` 을 Supabase에서 실행해야 한다.
위치 편집까지 사용하려면 `supabase/migrations/20260924_house_hero_image_position.sql`도 실행해야 한다.

## 다음

NeighborContentBlock 1|2|3 · Poster View (원본 복제 없이 공간 압축)
