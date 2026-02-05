'use server'

// V2 Actions to break cache
export async function getLiveRoundDataV2(roundId: string) {
    console.log("DIAG: getLiveRoundDataV2", roundId);
    return null;
}

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function getInitialLivePageDataV2(todayStr: string) {
    console.log("SERVER ACTION: getInitialLivePageDataV2", todayStr);

    console.log("SERVER ACTION: getInitialLivePageDataV2 (HARDCODED DIAGNOSTIC)");
    // DIAGNOSTIC MODE: Return static data to prove connection works
    return {
        activeRound: null,
        allLiveRounds: [],
        lastUsedCourseId: null,
        lastUsedTeeBoxId: null
    };
}
