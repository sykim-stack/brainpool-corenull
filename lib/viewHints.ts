// lib/viewHints.ts
// CoreHub 기회 → CoreNull 전 뷰 힌트 변환
// CoreNull 자기 영역에서 라벨/표시 로직 결정 (CoreHub는 종류만 제공)

import type { CoreHubOpportunity } from './corehubAuthBridge'

// CoreHub 기회 타입 (이미 정해져 있음)
type OpportunityType = 
  | 'nudge.seed.owner'
  | 'celebrate.achievement'
  | 'suggest.translation.help'

// CoreNull 각 뷰별 힌트 타입
export interface YardHints {
  highlightRoomIds: string[]          // 씨드 위험 방 강조
  seedRiskBanner: boolean             // 상단 씨드 위험 배너
  translationHelperChips: string[]    // 번역 도우미 대상 이웃 house_id
  celebrationMode: boolean            // 열매 축하 모드 (마당에서도 가볍게)
}

export interface LivingHints {
  fruitBadges: string[]               // 열매 달성 방 IDs
  harvestHighlights: string[]         // 수확 하이라이트 방 IDs
  celebrationBanner: boolean          // 축하 배너
  seedNudgeRooms: string[]            // 씨드 독려 대상 방
}

export interface RoomHints {
  seedPulsing: boolean                // 씨드 방 펄싱
  fruitBadge: boolean                 // 열매 배지
  translationMode: boolean            // 번역 모드 기본 켬
  seedCountdown: string | null        // 씨드 종료일 ISO
}

export interface PlazaHints {
  recommendedHouses: string[]         // 추천 집 IDs (다국어 관계)
  translationFilter: boolean          // 언어 다른 이웃 필터 표시
}

export interface LibraryHints {
  harvestSummary: {                   // 수확 요약
    count: number
    latestFruitIds: string[]
  }
  seedAtRiskCount: number             // 위험 씨드 수
}

export interface NeighborsHints {
  translationHelperTargets: string[]  // 번역 도움 대상 이웃 IDs
  pendingWithTranslation: string[]    // 번역 필요한 대기 중 신청
}

export interface AllViewHints {
  yard: YardHints
  living: LivingHints
  room: RoomHints
  plaza: PlazaHints
  library: LibraryHints
  neighbors: NeighborsHints
}

// 초기 빈 힌트
function emptyHints(): AllViewHints {
  return {
    yard: { highlightRoomIds: [], seedRiskBanner: false, translationHelperChips: [], celebrationMode: false },
    living: { fruitBadges: [], harvestHighlights: [], celebrationBanner: false, seedNudgeRooms: [] },
    room: { seedPulsing: false, fruitBadge: false, translationMode: false, seedCountdown: null },
    plaza: { recommendedHouses: [], translationFilter: false },
    library: { harvestSummary: { count: 0, latestFruitIds: [] }, seedAtRiskCount: 0 },
    neighbors: { translationHelperTargets: [], pendingWithTranslation: [] },
  }
}

/**
 * CoreHub 기회 배열 → 전체 뷰 힌트 생성
 * CoreNull 자기 영역에서 라벨/표시 로직 완전 결정
 */
export function buildAllViewHints(
  opportunities: CoreHubOpportunity[],
  myRooms: any[],
  alleyNeighbors: any[]
): AllViewHints {
  const hints = emptyHints()

  for (const opp of opportunities) {
    const payload = opp.payload || {}
    const roomId = payload.room_id
    const houseId = payload.house_id
    const endDate = payload.bloom_date || payload.end_date

    switch (opp.opportunity_type) {
      case 'nudge.seed.owner': {
        // 씨드 방치 위험
        if (roomId) {
          hints.yard.highlightRoomIds.push(roomId)
          hints.living.seedNudgeRooms.push(roomId)
          hints.room.seedPulsing = true
          if (endDate) hints.room.seedCountdown = endDate
        }
        hints.yard.seedRiskBanner = true
        hints.library.seedAtRiskCount++
        break
      }

      case 'celebrate.achievement': {
        // 씨앗→열매 달성
        if (roomId) {
          hints.living.fruitBadges.push(roomId)
          hints.living.harvestHighlights.push(roomId)
          hints.room.fruitBadge = true
        }
        hints.yard.celebrationMode = true
        hints.living.celebrationBanner = true
        hints.library.harvestSummary.count++
        if (roomId) hints.library.harvestSummary.latestFruitIds.push(roomId)
        break
      }

      case 'suggest.translation.help': {
        // 다국어 관계 형성 → 번역 도우미
        if (houseId) {
          hints.yard.translationHelperChips.push(houseId)
          hints.plaza.recommendedHouses.push(houseId)
          hints.neighbors.translationHelperTargets.push(houseId)
        }
        hints.plaza.translationFilter = true
        hints.room.translationMode = true
        break
      }
    }
  }

  // 중복 제거
  hints.yard.highlightRoomIds = [...new Set(hints.yard.highlightRoomIds)]
  hints.yard.translationHelperChips = [...new Set(hints.yard.translationHelperChips)]
  hints.living.fruitBadges = [...new Set(hints.living.fruitBadges)]
  hints.living.harvestHighlights = [...new Set(hints.living.harvestHighlights)]
  hints.living.seedNudgeRooms = [...new Set(hints.living.seedNudgeRooms)]
  hints.plaza.recommendedHouses = [...new Set(hints.plaza.recommendedHouses)]
  hints.neighbors.translationHelperTargets = [...new Set(hints.neighbors.translationHelperTargets)]
  hints.library.harvestSummary.latestFruitIds = [...new Set(hints.library.harvestSummary.latestFruitIds)]

  return hints
}

/**
 * 개별 방 컨텍스트용 힌트 추출 (RoomClient 등에서 사용)
 */
export function getRoomHintsForRoom(
  allHints: AllViewHints,
  roomId: string,
  room: any
): RoomHints {
  const base = allHints.room
  return {
    seedPulsing: base.seedPulsing && allHints.yard.highlightRoomIds.includes(roomId),
    fruitBadge: base.fruitBadge && allHints.living.fruitBadges.includes(roomId),
    translationMode: base.translationMode || room.primary_language !== 'ko',
    seedCountdown: room.seed_mode && room.bloom_date ? room.bloom_date : base.seedCountdown,
  }
}

/**
 * 골목 이웃 칩용 힌트 추출 (NeighborContentBlock에서 사용)
 */
export function getAlleyChipHints(
  allHints: AllViewHints,
  houseId: string
): { showTranslationHelper: boolean; isRecommended: boolean } {
  return {
    showTranslationHelper: allHints.yard.translationHelperChips.includes(houseId),
    isRecommended: allHints.plaza.recommendedHouses.includes(houseId),
  }
}