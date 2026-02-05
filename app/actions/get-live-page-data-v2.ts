'use server'

// V2 Actions to break cache
export async function getLiveRoundDataV2(roundId: string) {
    console.log("DIAG: getLiveRoundDataV2", roundId);
    return null;
}

export async function getInitialLivePageDataV2(todayStr: string) {
    console.log("DIAG: getInitialLivePageDataV2", todayStr);
    return {
        activeRound: null,
        allLiveRounds: [],
        lastUsedCourseId: null,
        lastUsedTeeBoxId: null
    };
}
