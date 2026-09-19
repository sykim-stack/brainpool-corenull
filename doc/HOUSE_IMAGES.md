# House Images

**상태**: feat/house-images 구현 중  
**원칙**: 원본을 늘리지 않고 View를 풍부하게 한다. Poster보다 House 이미지를 먼저.

## 슬롯 (House Owner)

| 컬럼 | 용도 |
|------|------|
| `avatar_url` | 프로필 / Ring 중앙 |
| `yard_image_url` | 마당 · 골목 Hero |
| `living_image_url` | 거실 · 복도 Hero |

## 파이프라인

```
/me/house UI
  → /api/corenull/upload  (기존 write 업로드)
  → URL
  → PATCH /api/corenull/houses  (owner_key 검증)
  → corenull_houses
  → HeroBlock.imageUrl
```

새 업로드 API 없음.

## DB

`supabase/migrations/20260912_house_images.sql` 을 Supabase에서 실행해야 한다.

## 다음

NeighborContentBlock 1|2|3 · Poster View (원본 복제 없이 공간 압축)
