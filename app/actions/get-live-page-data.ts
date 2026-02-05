'use server'

export async function getLiveRoundData(roundId: string) {
    return null;
}

export async function getInitialLivePageData(todayStr: string) {
    return {
        activeRound: null,
        allLiveRounds: [],
        lastUsedCourseId: null,
        lastUsedTeeBoxId: null
    };
}
