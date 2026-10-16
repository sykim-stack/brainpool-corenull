'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getOwnerKey } from '@/lib/ownerKey'
import { getActiveHouseId, setActiveHouseId } from '@/lib/activeHouse'
import TopBar from '@/components/blocks/TopBar'
import CoreNullLogo from '@/components/corenull/CoreNullLogo'
import YardBlock from '@/components/blocks/YardBlock'
import InlineHeroImageControls from '@/components/corenull/InlineHeroImageControls'
import YardHouseHandles from '@/components/corenull/YardHouseHandles'
import DoorplateEditModal from '@/components/corenull/DoorplateEditModal'
import { houseHeroBackground, houseAvatarUrl, buildRingData, formatSince, LANG_FLAG } from '@/lib/houseHero'

// NOTE: This is a temporary simplified push marker - full content follows in recovery
export default function YardPageBroken() {
  return <div>loading yard...</div>
}
