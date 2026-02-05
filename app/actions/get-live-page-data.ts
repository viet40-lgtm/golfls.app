'use server'

export async function getLiveRoundData(roundId: string) {
    console.log("DIAG: getLiveRoundData", roundId);
    return null;
}

export async function getInitialLivePageData(todayStr: string) {
    console.log("DIAG: getInitialLivePageData", todayStr);
    return {
        activeRound: null,
        allLiveRounds: [],
        lastUsedCourseId: null,
        lastUsedTeeBoxId: null
    };
}
